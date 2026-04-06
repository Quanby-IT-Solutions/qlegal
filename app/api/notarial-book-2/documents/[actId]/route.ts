import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

/**
 * API Route for Notarial Book 2 - Programmatic Document Retrieval
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	try {
		const { actId } = await params
		const id = actId.trim()
		if (!id) return new NextResponse("Missing actId", { status: 400 })

		const sessionMod = await import("@/services/next-auth")
		const session = await sessionMod.auth()
		if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

		const { db } = await import("@/services/drizzle/db")
		const { notarialActs, notarialBooks } = await import("@/services/drizzle/schema/notarial-book")
		const { users } = await import("@/services/drizzle/schema/auth")
		const { downloadDoconchainSealedProject } = await import(
			"@/services/doconchain/projects/download-sealed-project"
		)
		const { getDoconchainProjectDetails } = await import(
			"@/services/doconchain/projects/get-project-details"
		)

		// ENP-only
		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
			columns: { role: true, email: true },
		})
		if (String(user?.role ?? "").trim().toUpperCase() !== "ENP") {
			return new NextResponse("Forbidden", { status: 403 })
		}
		const enpEmail = (user?.email ?? "").trim().toLowerCase()
		if (!enpEmail) return new NextResponse("Missing user email", { status: 500 })

		const act = await db.query.notarialActs.findFirst({
			where: eq(notarialActs.id, id),
			columns: { id: true, notarialBookId: true, docoChainProjectUuid: true, documentName: true },
		})
		if (!act) return new NextResponse("Notarial act not found", { status: 404 })

		const book = await db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.id, act.notarialBookId),
			columns: { enpId: true },
		})
		if (book?.enpId !== session.user.id) return new NextResponse("Forbidden", { status: 403 })

		const projectUuid = (act.docoChainProjectUuid ?? "").trim()
		if (!projectUuid) return new NextResponse("Missing DocOnChain project UUID", { status: 404 })

		// Ensure DocOnChain finished processing (seal applied).
		const status = await getDoconchainProjectDetails({ projectUuid, email: enpEmail })
		const statusUpper = String(status.projectStatus ?? "").toUpperCase()
		const isCompleted = statusUpper === "COMPLETED" || (status.completedAt ?? null) !== null
		if (!isCompleted) return new NextResponse("Document is still being processed...", { status: 425 })

		const result = await downloadDoconchainSealedProject({ projectUuid, email: enpEmail })

		const download = request.nextUrl.searchParams.get("download")
		const wantsDownload = download === "1" || download?.toLowerCase() === "true"
		const baseName = act.documentName?.trim() ? act.documentName.trim() : `notarized-document-${projectUuid}.pdf`
		const filename = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`

		return new NextResponse(new Uint8Array(result.buffer), {
			headers: {
				"Content-Type": result.contentType ?? "application/pdf",
				"Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${filename.replace(/"/g, "")}"`,
				"Cache-Control": "no-store",
			},
		})
	} catch (error) {
		console.error("Notarial book 2 document stream error:", error)
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 425) return new NextResponse("Document is still being processed...", { status: 425 })
		if (status === 404) return new NextResponse("Notarized document not found", { status: 404 })
		return new NextResponse("Internal server error", { status: 500 })
	}
}
