import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { documents } from "@/services/drizzle/schema/document"
import { meetings } from "@/services/drizzle/schema/meetings"
import { users } from "@/services/drizzle/schema/auth"
import { auth } from "@/services/next-auth"
import { getDoconchainProjectDetails } from "@/services/doconchain/projects/get-project-details"
import { downloadDoconchainSealedProject } from "@/services/doconchain/projects/download-sealed-project"

export async function GET(_request: Request, { params }: { params: Promise<{ projectUuid: string }> }) {
	try {
		const { projectUuid } = await params
		const uuid = projectUuid.trim()

		const session = await auth()
		if (!session?.user?.id) {
			return new NextResponse("Unauthorized", { status: 401 })
		}

		const doc = await db.query.documents.findFirst({
			where: eq(documents.docoChainProjectId, uuid),
			with: {
				meeting: {
					with: {
						appointments: {
							with: { participants: { columns: { userId: true } } },
						},
					},
				},
			},
		})

		if (!doc?.id || !doc.meetingId || !doc.meeting) {
			return new NextResponse("Document not found", { status: 404 })
		}

		const hasAccess = (doc.meeting.appointments ?? []).some(apt =>
			(apt.participants ?? []).some(p => p.userId === session.user.id)
		)
		if (!hasAccess) {
			return new NextResponse("Forbidden", { status: 403 })
		}

		// Use meeting creator email for DocOnChain API calls (must be a DocOnChain org member).
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, doc.meetingId),
			columns: { createdById: true },
		})
		if (!meeting?.createdById) return new NextResponse("Meeting not found", { status: 404 })

		const creator = await db.query.users.findFirst({
			where: eq(users.id, meeting.createdById),
			columns: { email: true },
		})
		const creatorEmail = creator?.email?.trim().toLowerCase()
		if (!creatorEmail) return new NextResponse("Missing creator email", { status: 500 })

		// Ensure DocOnChain finished processing (seal applied).
		const status = await getDoconchainProjectDetails({ projectUuid: uuid, email: creatorEmail })
		const statusUpper = String(status.projectStatus ?? "").toUpperCase()
		const isCompleted = statusUpper === "COMPLETED" || (status.completedAt ?? null) !== null
		if (!isCompleted) {
			return new NextResponse("Document is still being processed...", { status: 425 })
		}

		// DocOnChain may mark the project COMPLETED before the sealed PDF is ready. Wait so the
		// download returns the version with the notarial seal applied.
		const sealSettleMs = 5_000
		await new Promise(resolve => setTimeout(resolve, sealSettleMs))

		const result = await downloadDoconchainSealedProject({ projectUuid: uuid, email: creatorEmail })
		const filename = result.filename ?? (doc.name?.toLowerCase().endsWith(".pdf") ? doc.name : `${doc.name}.pdf`)

		return new NextResponse(new Uint8Array(result.buffer), {
			headers: {
				"Content-Type": result.contentType ?? "application/pdf",
				"Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
				"Cache-Control": "no-store",
			},
		})
	} catch (error) {
		console.error("DocOnChain signed stream error:", error)
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 425) {
			return new NextResponse("Document is still being processed...", { status: 425 })
		}
		if (status === 404) {
			return new NextResponse("Notarized document not found", { status: 404 })
		}
		return new NextResponse("Internal server error", { status: 500 })
	}
}

