"use client"

export type SyncKycCallbackResult =
	| { success: true }
	| { success: false; error: string }

export async function syncKycStatusFromCallbackRequest(
	transactionId: string,
	status: string
): Promise<SyncKycCallbackResult> {
	const response = await fetch("/api/kyc/sync-callback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ transactionId, status }),
	})

	const payload = (await response.json().catch(() => null)) as SyncKycCallbackResult | null

	if (!response.ok) {
		return {
			success: false,
			error: payload?.success === false ? payload.error : "Failed to save verification status",
		}
	}

	return payload ?? { success: true }
}
