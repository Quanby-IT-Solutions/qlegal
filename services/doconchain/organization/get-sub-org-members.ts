import { env } from "@/env"
import {
	getDoconchainApiToken,
	getDoconchainApiTokenWithEnterpriseCreds,
} from "@/services/doconchain/auth/generate-token"

type SubOrgMemberItem = {
	email?: string
	name?: string
	first_name?: string
	last_name?: string
	role?: string
	access_level?: string
	status?: string
	added_date?: string
	clientId?: number | string
}

type SubOrgMembersResponse =
	| SubOrgMemberItem[]
	| {
			message?: string
			data?: SubOrgMemberItem[]
			meta?: unknown
	  }

function asList(parsed: SubOrgMembersResponse): SubOrgMemberItem[] {
	if (Array.isArray(parsed)) return parsed
	if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) return parsed.data
	return []
}

export async function getDoconchainSubOrgMembers(input: {
	subOrganizationUuid: string
	clientKey?: string | null
	clientSecret?: string | null
}): Promise<SubOrgMemberItem[]> {
	const uuid = input.subOrganizationUuid.trim()
	if (!uuid) throw new Error("DocOnChain sub-org members requires subOrganizationUuid.")

	const url = new URL(`/api/v2/sub-organizations/${uuid}/members`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await fetch(url.toString(), {
		method: "GET",
		headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
	})
	if (res.status === 401) {
		// Retry with a fresh token first
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
		})

		// If still unauthorized, DocOnChain may require sub-org scoped enterprise creds for this endpoint.
		if (res.status === 401 && input.clientKey && input.clientSecret) {
			const scoped = await getDoconchainApiTokenWithEnterpriseCreds({
				email: env.DOCONCHAIN_EMAIL,
				clientKey: input.clientKey,
				clientSecret: input.clientSecret,
			})
			res = await fetch(url.toString(), {
				method: "GET",
				headers: { Authorization: `Bearer ${scoped}`, accept: "application/json" },
			})
		}
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain get sub-org members failed (${res.status} ${res.statusText})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	const parsed = (text ? (JSON.parse(text) as SubOrgMembersResponse) : []) as SubOrgMembersResponse
	return asList(parsed)
}

