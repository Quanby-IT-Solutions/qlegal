import { NextRequest, NextResponse } from "next/server"

import { db } from "@/services/drizzle/db"
import { documents } from "@/services/drizzle/schema/document"
import { meetings, meetingParticipants } from "@/services/drizzle/schema/meetings"
import { eq, and } from "drizzle-orm"
import { getServiceRoleClient } from "@/services/supabase"
import { auth } from "@/services/next-auth"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const session = await auth()

		if (!session?.user?.id) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			)
		}

		// Get document from database
		const document = await db.query.documents.findFirst({
			where: eq(documents.id, id),
			with: {
				meeting: {
					with: {
						participants: true,
					},
				},
			},
		})

		if (!document) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 }
			)
		}

		// Check if user has access to the document
		// If document is associated with a meeting, check meeting access
		if (document.meetingId && document.meeting) {
			const hasAccess = document.meeting.participants.some(
				(p) => p.userId === session.user.id
			)

			if (!hasAccess) {
				return NextResponse.json(
					{ error: "You don't have access to this document" },
					{ status: 403 }
				)
			}
		} else {
			// For documents not in meetings, check if user is the creator
			// This is a fallback - meeting documents should always have meetingId
			return NextResponse.json(
				{ error: "Document access not configured" },
				{ status: 403 }
			)
		}

		// If document has no path, it might not be uploaded yet
		if (!document.path) {
			return NextResponse.json(
				{ error: "Document file not available. The document may not have been uploaded to storage yet." },
				{ status: 404 }
			)
		}

		// Get document from Supabase storage
		const supabase = getServiceRoleClient()
		
		// Try to download from documents bucket first
		let data = null
		let error = null
		
		const { data: downloadData, error: downloadError } = await supabase.storage
			.from("documents")
			.download(document.path)
		
		data = downloadData
		error = downloadError

		// If not found in documents bucket, try envelopes bucket (for signed documents)
		if (error || !data) {
			const { data: envelopeData, error: envelopeError } = await supabase.storage
				.from("envelopes")
				.download(document.path)
			
			if (envelopeData && !envelopeError) {
				data = envelopeData
				error = null
			}
		}

		if (error || !data) {
			console.error("Error downloading document from Supabase:", error)
			console.error("Document path:", document.path)
			console.error("Document ID:", document.id)
			return NextResponse.json(
				{ 
					error: "Failed to retrieve document file. The document may have been deleted or moved.",
					details: error?.message || "File not found in storage"
				},
				{ status: 404 }
			)
		}

		// Convert blob to buffer
		const arrayBuffer = await data.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		// Return PDF with appropriate headers
		return new NextResponse(buffer, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${document.name}"`,
				"Cache-Control": "public, max-age=3600",
			},
		})
	} catch (error) {
		console.error("Error in document API route:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		)
	}
}

