import { env } from "@/env"
import {
	getDoconchainApiToken,
	getDoconchainApiTokenWithEnterpriseCreds,
} from "@/services/doconchain/auth/generate-token"

type SubOrgDetailsResponse = {
	message?: string
	data?: Record<string, unknown>
} | Record<string, unknown>

function getNumericCredits(obj: Record<string, unknown>): number | null {
	const keys = [
		"credits",
		"balance",
		"available_credits",
		"credit_balance",
		"credits_balance",
		"remaining_credits",
		"total_credits",
	]
	for (const k of keys) {
		const v = obj[k]
		if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v)
		if (typeof v === "string") {
			const n = Number.parseInt(v, 10)
			if (Number.isFinite(n) && n >= 0) return n
		}
	}
	// Nested: data.organization.credits, data.credits, etc.
	const nested = obj.organization ?? obj.sub_organization ?? obj.sub_org
	if (nested && typeof nested === "object" && !Array.isArray(nested)) {
		const found = getNumericCredits(nested as Record<string, unknown>)
		if (found !== null) return found
	}
	return null
}

/**
 * Fetch current credits/balance for a DocOnChain sub-organization.
 * Uses GET sub-org details; parses credits from response (credits, balance, available_credits, etc.).
 * When parent token returns 401, retries with sub-org clientKey/clientSecret if provided.
 */
export async function getDoconchainSubOrgCredits(input: {
	subOrganizationUuid: string
	clientKey?: string | null
	clientSecret?: string | null
}): Promise<{ credits: number | null; raw?: SubOrgDetailsResponse }> {
	const uuid = input.subOrganizationUuid.trim()
	if (!uuid) throw new Error("DocOnChain get sub-org credits requires subOrganizationUuid.")

	const url = new URL(`/api/v2/organizations/sub/${uuid}`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const doRequest = async (token: string): Promise<Response> =>
		fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
		})

	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await doRequest(token)
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await doRequest(token)
	}
	if (res.status === 401 && input.clientKey && input.clientSecret) {
		const scoped = await getDoconchainApiTokenWithEnterpriseCreds({
			email: env.DOCONCHAIN_EMAIL,
			clientKey: input.clientKey,
			clientSecret: input.clientSecret,
		})
		res = await doRequest(scoped)
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain get sub-org credits failed (${res.status} ${res.statusText})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	const raw = (text ? (JSON.parse(text) as SubOrgDetailsResponse) : {}) as SubOrgDetailsResponse
	const data =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? ("data" in raw && raw.data && typeof raw.data === "object"
					? (raw.data as Record<string, unknown>)
					: (raw as Record<string, unknown>))
			: ({} as Record<string, unknown>)

	const credits = getNumericCredits(data)
	return { credits, raw }
}
