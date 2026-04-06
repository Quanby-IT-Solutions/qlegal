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
	/**
	 * Optional: an email known to be a member of this sub-org.
	 * When sub-org enterprise creds are used, DocOnChain often requires the token be generated
	 * with a member/admin email that exists in that sub-org.
	 */
	tokenEmail?: string | null
}): Promise<SubOrgMemberItem[]> {
	const uuid = input.subOrganizationUuid.trim()
	if (!uuid) throw new Error("DocOnChain sub-org members requires subOrganizationUuid.")

	const url = new URL(`/api/v2/sub-organizations/${uuid}/members`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const doRequest = (t: string) =>
		fetch(url.toString(), {
			method: "GET",
			headers: {
				Authorization: `Bearer ${t}`,
				accept: "application/json",
				"content-type": "application/json",
			},
		})

	// Prefer sub-org scoped token when we have creds (avoids "User not found" when DOCONCHAIN_EMAIL
	// is only in the sub-org). Fall back to parent/explicit token if sub-org generate fails or returns 401.
	let res: Response
	const getToken = async (): Promise<string | null> => {
		try {
			// If an explicit token is configured, email here doesn't matter; otherwise this will
			// generate a token for the configured parent-org email.
			return await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
		} catch {
			return null
		}
	}
	if (input.clientKey && input.clientSecret) {
		let token: string | null = null
		const tokenEmail = (input.tokenEmail ?? "").trim().toLowerCase() || env.DOCONCHAIN_EMAIL.trim().toLowerCase()
		try {
			token = await getDoconchainApiTokenWithEnterpriseCreds({
				email: tokenEmail,
				clientKey: input.clientKey,
				clientSecret: input.clientSecret,
			})
		} catch {
			// Sub-org generate can return "User not found" if email isn't in sub-org; try parent/explicit.
			token = await getToken()
		}
		if (token) {
			res = await doRequest(token)
			if (res.status === 401) {
				token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true }).catch(() => null)
				if (token) res = await doRequest(token)
			}
		} else {
			token = await getToken()
			res = token ? await doRequest(token) : new Response("", { status: 401 })
		}
	} else {
		let token = await getToken()
		if (!token) {
			res = new Response("", { status: 401 })
		} else {
			res = await doRequest(token)
			if (res.status === 401) {
				token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true }).catch(() => null)
				if (token) res = await doRequest(token)
			}
		}
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const hint =
			res.status === 401
				? " Set DOCONCHAIN_USER_TOKEN to a Bearer token from DocOnChain, or ensure DOCONCHAIN_EMAIL is a member of the parent or sub-org."
				: ""
		throw new Error(
			`DocOnChain get sub-org members failed (${res.status} ${res.statusText})${text ? `: ${text.slice(0, 300)}` : ""}${hint}`
		)
	}

	const parsed = (text ? (JSON.parse(text) as SubOrgMembersResponse) : [])
	return asList(parsed)
}

