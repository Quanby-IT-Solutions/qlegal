import { NextResponse } from "next/server"

import {
	checkUserKycStatus,
	dismissKycExpiryNotice,
	getKycWebSdkSession,
	getUserKycInfo,
	softResetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"

type KycClientAction =
	| "check-status"
	| "dismiss-expiry-notice"
	| "get-info"
	| "get-web-sdk-session"
	| "soft-reset"

interface KycClientRequestBody {
	action?: unknown
}

function isKycClientAction(value: unknown): value is KycClientAction {
	return (
		value === "check-status" ||
		value === "dismiss-expiry-notice" ||
		value === "get-info" ||
		value === "get-web-sdk-session" ||
		value === "soft-reset"
	)
}

export async function POST(request: Request) {
	let body: KycClientRequestBody

	try {
		body = (await request.json()) as KycClientRequestBody
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON body" },
			{ status: 400 }
		)
	}

	if (!isKycClientAction(body.action)) {
		return NextResponse.json(
			{ success: false, error: "Invalid KYC action" },
			{ status: 400 }
		)
	}

	switch (body.action) {
		case "check-status":
			return NextResponse.json(await checkUserKycStatus())
		case "dismiss-expiry-notice":
			return NextResponse.json(await dismissKycExpiryNotice())
		case "get-info":
			return NextResponse.json(await getUserKycInfo())
		case "get-web-sdk-session":
			return NextResponse.json(await getKycWebSdkSession())
		case "soft-reset":
			return NextResponse.json(await softResetUserKycStatus())
	}
}
