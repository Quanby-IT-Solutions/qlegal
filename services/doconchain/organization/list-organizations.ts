import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

type OrganizationItem = {
	id?: number | string
	uuid?: string
	parent_id?: number | null
	name?: string
	type?: string
	created_at?: string
	updated_at?: string
	[key: string]: unknown
}

type OrganizationsResponse =
	| { organizations?: OrganizationItem[] }
	| { data?: OrganizationItem[] }
	| OrganizationItem[]

function asList(parsed: OrganizationsResponse): OrganizationItem[] {
	if (Array.isArray(parsed)) return parsed
	if (parsed && typeof parsed === "object") {
		if (Array.isArray(parsed.organizations)) return parsed.organizations
		if (Array.isArray(parsed.data)) return parsed.data
	}
	return []
}

export async function listDoconchainOrganizations(): Promise<OrganizationItem[]> {
	const url = new URL("/api/v2/organizations", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await fetch(url.toString(), {
		method: "GET",
		headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
	})
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
		})
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain list organizations failed (${res.status} ${res.statusText})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	const parsed = (text ? (JSON.parse(text) as OrganizationsResponse) : []) as OrganizationsResponse
	return asList(parsed)
}

