import { NextResponse } from "next/server"

// Sentinel route to verify deployed code identity on Cloud Run.
// Hit GET /api/_debug/version — should return a JSON with SENTINEL_v2 marker.
export const dynamic = "force-dynamic"

export async function GET() {
	return NextResponse.json({
		sentinel: "SENTINEL_v2_KYC_GUARD",
		commit: process.env.COMMIT_SHA ?? null,
		nodeEnv: process.env.NODE_ENV ?? null,
		ts: new Date().toISOString(),
	})
}
