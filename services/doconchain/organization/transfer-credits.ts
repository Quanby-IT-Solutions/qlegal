import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

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
		throw new Error(
			raw.message ??
				`DocOnChain transfer credits failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}
	if (!raw.success) {
		throw new Error(raw.message ?? "DocOnChain transfer credits failed.")
	}
	return {
		success: true,
		transferredCredits: raw.data?.transferred_credits ?? credits,
		remainingCredits: raw.data?.remaining_credits,
		raw,
	}
}
