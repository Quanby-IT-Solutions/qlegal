import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { downloadSignedDocument } from "@/services/docochain"
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

		return new NextResponse(buffer, {
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

