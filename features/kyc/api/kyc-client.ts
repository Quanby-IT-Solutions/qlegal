"use client"

import type {
	checkUserKycStatus,
	dismissKycExpiryNotice,
	getKycWebSdkSession,
	getUserKycInfo,
	softResetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"

type AwaitedReturn<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>

type KycClientAction =
	| "check-status"
	| "dismiss-expiry-notice"
	| "get-info"
	| "get-web-sdk-session"
	| "soft-reset"

async function requestKycAction<TResult>(action: KycClientAction): Promise<TResult> {
	const response = await fetch("/api/kyc/client", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action }),
	})

	const payload = (await response.json().catch(() => null)) as TResult | null

	if (!response.ok) {
		const error =
			payload &&
			typeof payload === "object" &&
			"error" in payload &&
			typeof payload.error === "string"
				? payload.error
				: "KYC request failed"
		throw new Error(error)
	}

	if (!payload) {
		throw new Error("KYC request returned an empty response")
	}

	return payload
}

export function checkUserKycStatusRequest() {
	return requestKycAction<AwaitedReturn<typeof checkUserKycStatus>>("check-status")
}

export function dismissKycExpiryNoticeRequest() {
	return requestKycAction<AwaitedReturn<typeof dismissKycExpiryNotice>>(
		"dismiss-expiry-notice"
	)
}

export function getKycWebSdkSessionRequest() {
	return requestKycAction<AwaitedReturn<typeof getKycWebSdkSession>>("get-web-sdk-session")
}

export function getUserKycInfoRequest() {
	return requestKycAction<AwaitedReturn<typeof getUserKycInfo>>("get-info")
}

export function softResetUserKycStatusRequest() {
	return requestKycAction<AwaitedReturn<typeof softResetUserKycStatus>>("soft-reset")
}
