import { NextResponse, type NextRequest } from "next/server"

// Redirect to notarial-book-2 API route
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	const { actId } = await params
	// Redirect to the new API route
	return NextResponse.redirect(new URL(`/api/notarial-book-2/documents/${actId}`, request.url))
}
