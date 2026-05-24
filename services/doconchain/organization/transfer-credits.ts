import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type TransferCreditsResponse = {
	success?: boolean
	message?: string
	data?: {
		parent_org_uuid?: string
		sub_org_uuid?: string
		transferred_credits?: number
		remaining_credits?: number
	}
	error_code?: string
}

export async function transferDoconchainCreditsToSubOrg(input: {
	subOrgUuid: string
	credits: number
}): Promise<{
	success: boolean
	transferredCredits: number
	remainingCredits?: number
	raw: TransferCreditsResponse
}> {
	const subOrgUuid = input.subOrgUuid.trim()
	if (!subOrgUuid) {
		throw new Error("DocOnChain transfer credits requires sub_org_uuid.")
	}
	const credits = Math.floor(Number(input.credits))
	if (credits < 1) {
		throw new Error("DocOnChain transfer credits requires a positive integer.")
	}

	const url = new URL("/api/v2/organizations/transfer/credits", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const doRequest = async (token: string): Promise<Response> => {
		const body = new FormData()
		body.set("sub_org_uuid", subOrgUuid)
		body.set("credits", String(credits))
		return fetch(url.toString(), {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body,
		})
	}

	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await doRequest(token)
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await doRequest(token)
	}

	const text = await res.text().catch(() => "")
	const raw = (text ? (JSON.parse(text) as TransferCreditsResponse) : {}) as TransferCreditsResponse
	if (!res.ok) {
		const baseMessage =
			raw.message ??
			`DocOnChain transfer credits failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		if (res.status === 401) {
			throw new Error(
				`${baseMessage} Ensure DOCONCHAIN_EMAIL is an org admin in DocOnChain, or set DOCONCHAIN_USER_TOKEN to a token from an admin account (e.g. from DocOnChain app).`
			)
		}
		throw new Error(baseMessage)
	}
	// DocOnChain may return 200 with message "Credits added successful." but omit success: true
	const message = (raw.message ?? "").toLowerCase()
	const looksSuccess =
		raw.success === true || message.includes("successful") || message.includes("transferred")
	if (!looksSuccess) {
		throw new Error(raw.message ?? "DocOnChain transfer credits failed.")
	}
	return {
		success: true,
		transferredCredits: raw.data?.transferred_credits ?? credits,
		remainingCredits: raw.data?.remaining_credits,
		raw,
	}
}
