import { NextResponse, type NextRequest } from "next/server"

/**
 * API Route for Notarial Book 2 - Programmatic Document Retrieval
 *
 * Temporarily disabled while the signing integration is being rebuilt.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	const { actId } = await params
	return new NextResponse(
		`Document retrieval is temporarily unavailable while we rebuild the signing integration. (requested: ${actId})`,
		{ status: 503, headers: { "Content-Type": "text/plain" } }
	)
}
