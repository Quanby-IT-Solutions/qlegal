/**
 * Signed Document Streaming API Route
 *
 * This API route exists because tRPC cannot provide a navigable URL for browser operations.
 * It's used by `window.open()` calls in the meetings feature to open signed PDFs in new tabs.
 *
 * Why not use tRPC?
 * - tRPC returns JSON, not streamable binary data
 * - `window.open()` requires a URL that browsers can directly navigate to
 * - This route streams the PDF directly to the browser with proper Content-Type headers
 *
 * Security:
 * - Authenticates via NextAuth session (no DocoChain api_token exposed in URLs)
 * - Validates meeting participant access before serving the document
 *
 * @see /services/doconchain - Core DocoChain SDK (used by this route)
 * @see /features/meetings/components/video-meeting-client.tsx - Frontend consumer
 */
import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { downloadSignedDocument } from "@/services/doconchain"
import { db } from "@/services/drizzle/db"
import { documents } from "@/services/drizzle/schema/document"
import { auth } from "@/services/next-auth"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ projectUuid: string }> }
) {
	try {
		const { projectUuid } = await params
		const session = await auth()

		if (!session?.user?.id) {
			// Return plain text error for PDF viewer compatibility
			return new NextResponse("Unauthorized: Please log in to view signed documents.", {
				status: 401,
				headers: { "Content-Type": "text/plain" },
			})
		}

		// Find the document for this project and verify meeting access
		const document = await db.query.documents.findFirst({
			where: eq(documents.docoChainProjectId, projectUuid),
			with: {
				meeting: {
					with: {
						participants: true,
						createdBy: {
							columns: { email: true },
						},
					},
				},
			},
		})

		if (!document?.meeting) {
			return new NextResponse("Document or meeting not found.", {
				status: 404,
				headers: { "Content-Type": "text/plain" },
			})
		}

		const hasAccess = document.meeting.participants.some(p => p.userId === session.user.id)
		if (!hasAccess) {
			return new NextResponse("Access denied: You don't have access to this document.", {
				status: 403,
				headers: { "Content-Type": "text/plain" },
			})
		}

		// Use meeting creator email for token generation (fallback to session user email)
		const creatorEmail = document.meeting.createdBy?.email ?? session.user.email ?? undefined

		const { buffer, fileName } = await downloadSignedDocument(projectUuid, creatorEmail)

		// NextResponse expects a web BodyInit. Convert Buffer -> Uint8Array (ArrayBuffer-backed),
		// then wrap in a Blob to satisfy TypeScript + runtime.
		const bytes = Uint8Array.from(buffer)
		const body = new Blob([bytes], { type: "application/pdf" })

		return new NextResponse(body, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${fileName}"`,
				"Cache-Control": "private, max-age=0, no-store",
			},
		})
	} catch (error) {
		console.error("Error serving signed DocoChain PDF:", error)
		return new NextResponse("Internal server error.", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		})
	}
}
