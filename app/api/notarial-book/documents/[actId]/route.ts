/* COMMENTED OUT - Using notarial-book-2 API route instead
import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { checkSigningStatus, downloadSignedDocument, getVaultItem } from "@/services/doconchain"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { auth } from "@/services/next-auth"
import { getServiceRoleClient } from "@/services/supabase"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	// ... entire implementation commented out ...
	return new NextResponse("This API route has been deprecated. Please use /api/notarial-book-2/documents/[actId] instead.", {
		status: 410, // Gone
		headers: {
			"Content-Type": "text/plain",
		},
	})
}
*/

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
