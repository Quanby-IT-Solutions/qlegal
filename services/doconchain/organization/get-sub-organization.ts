import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

type SubOrgDetailsResponse = {
	message?: string
	data?: Record<string, unknown>
} | Record<string, unknown>

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
	for (const k of keys) {
		const v = obj[k]
		if (typeof v === "string" && v.trim()) return v.trim()
	}
	return null
}

function pickNestedString(obj: Record<string, unknown>, path: string[]): string | null {
	let cur: unknown = obj
	for (const k of path) {
		if (!cur || typeof cur !== "object") return null
		cur = (cur as Record<string, unknown>)[k]
	}
	return typeof cur === "string" && cur.trim() ? cur.trim() : null
}

export async function getDoconchainSubOrganizationDetails(input: {
	subOrganizationUuid: string
}): Promise<{
	uuid: string
	clientKey: string | null
	clientSecret: string | null
	raw: SubOrgDetailsResponse
}> {
	const uuid = input.subOrganizationUuid.trim()
	if (!uuid) throw new Error("DocOnChain get sub-org details requires uuid.")

	const url = new URL(`/api/v2/organizations/sub/${uuid}`, env.DOCONCHAIN_API_URL)
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
			`DocOnChain get sub-org details failed (${res.status} ${res.statusText})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	const raw = (text ? (JSON.parse(text) as SubOrgDetailsResponse) : {})
	const data =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? ("data" in raw && raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : (raw as Record<string, unknown>))
			: ({} as Record<string, unknown>)

	// DocOnChain might use different key naming for these.
	const clientKey =
		pickString(data, ["client_key", "clientKey", "enterprise_client_key", "key"]) ??
		pickNestedString(data, ["credentials", "client_key"]) ??
		pickNestedString(data, ["credentials", "clientKey"]) ??
		pickNestedString(data, ["enterprise_credentials", "client_key"]) ??
		pickNestedString(data, ["enterprise_credentials", "clientKey"])

	const clientSecret =
		pickString(data, ["client_secret", "clientSecret", "enterprise_client_secret", "secret"]) ??
		pickNestedString(data, ["credentials", "client_secret"]) ??
		pickNestedString(data, ["credentials", "clientSecret"]) ??
		pickNestedString(data, ["enterprise_credentials", "client_secret"]) ??
		pickNestedString(data, ["enterprise_credentials", "clientSecret"])

	return { uuid, clientKey, clientSecret, raw }
}

