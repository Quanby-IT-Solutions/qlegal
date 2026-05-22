import { NextResponse } from "next/server"

import { syncKycStatusFromCallback } from "@/features/kyc/api/kyc.actions"

interface SyncKycCallbackPayload {
	transactionId?: unknown
	status?: unknown
}

export async function POST(request: Request) {
	let payload: SyncKycCallbackPayload

	try {
		payload = (await request.json()) as SyncKycCallbackPayload
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON body" },
			{ status: 400 }
		)
	}

	const transactionId = typeof payload.transactionId === "string" ? payload.transactionId : ""
	const status = typeof payload.status === "string" ? payload.status : ""

	if (!transactionId.trim() || !status.trim()) {
		return NextResponse.json(
			{ success: false, error: "Missing transactionId or status" },
			{ status: 400 }
		)
	}

	const result = await syncKycStatusFromCallback(transactionId, status)
	return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
