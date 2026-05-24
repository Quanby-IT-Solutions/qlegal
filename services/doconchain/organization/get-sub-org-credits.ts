import {
	getDoconchainApiToken,
	getDoconchainApiTokenWithEnterpriseCreds,
} from "@/services/doconchain/auth/generate-token"
import { getDoconchainOrganizationCredits } from "@/services/doconchain/organization/get-organization-credits"

import { env } from "@/env"

type SubOrgDetailsResponse =
	| {
			message?: string
			data?: Record<string, unknown>
	  }
	| Record<string, unknown>

export type SubOrgCreditsResult = {
	credits: number | null
	totalCredits: number | null
	usedCredits: number | null
	raw?: SubOrgDetailsResponse
}

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

type CreditsDataItem = {
	uuid?: string
	id?: number | string
	remaining_credits?: number
	allocated_credits?: number
	used_credits?: number
	total_credits?: number
	/** Some APIs use initial/transferred for total ever allocated */
	initial_credits?: number
	transferred_credits?: number
	sub_organizations?: CreditsDataItem[]
	[key: string]: unknown
}

function getNum(item: CreditsDataItem, ...keys: (keyof CreditsDataItem)[]): number | null {
	for (const k of keys) {
		const v = item[k]
		if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v)
		if (typeof v === "string") {
			const n = Number.parseInt(v, 10)
			if (Number.isFinite(n) && n >= 0) return n
		}
	}
	return null
}

/** Collect all org rows from items and their nested sub_organizations for lookup by uuid. */
function flattenCreditsItems(items: CreditsDataItem[]): CreditsDataItem[] {
	const out: CreditsDataItem[] = []
	for (const row of items) {
		out.push(row)
		const subs = row.sub_organizations
		if (Array.isArray(subs) && subs.length > 0) {
			out.push(...flattenCreditsItems(subs))
		}
	}
	return out
}

/** GET /api/v2/organizations/credits with a given token. Parse flat or data[] response. */
async function fetchCreditsWithToken(
	token: string,
	subOrgUuid: string
): Promise<SubOrgCreditsResult> {
	const url = new URL("/api/v2/organizations/credits", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")
	const res = await fetch(url.toString(), {
		method: "GET",
		headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
	})
	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain get organization credits failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`
		)
	}
	const raw = (text ? (JSON.parse(text) as Record<string, unknown>) : {}) as Record<string, unknown>

	// Sub-org token returns { message, data: [ { uuid, remaining_credits, allocated_credits, total_credits, used_credits, ... } ] }
	// or sometimes data: { remaining_credits, total_credits, used_credits } (single object).
	// Prefer total_credits for "total" (ever allocated); allocated_credits may be current balance. Derive used = total - remaining when missing.
	if (Array.isArray(raw.data) && raw.data.length > 0) {
		const items = raw.data as CreditsDataItem[]
		const match =
			items.find(
				row => String(row.uuid ?? "").trim() === subOrgUuid || String(row.id ?? "") === subOrgUuid
			) ?? items[0]
		const remaining = getNum(match, "remaining_credits")
		const allocated = getNum(match, "allocated_credits")
		// Total ever allocated: prefer total_credits / initial / transferred so "used = total - remaining" is correct
		const totalFromApi = getNum(match, "total_credits", "initial_credits", "transferred_credits")
		const totalCredits = totalFromApi ?? allocated ?? remaining
		const usedFromApi = getNum(match, "used_credits", "used", "consumed_credits")
		const used =
			usedFromApi !== null
				? usedFromApi
				: totalCredits !== null && remaining !== null
					? Math.max(0, totalCredits - remaining)
					: null
		return {
			credits: remaining,
			totalCredits,
			usedCredits: used,
			raw: raw as SubOrgDetailsResponse,
		}
	}

	// Single sub-org object in data (no array): { data: { remaining_credits, total_credits, used_credits, ... } }
	if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
		const match = raw.data as CreditsDataItem
		const remaining = getNum(match, "remaining_credits")
		const allocated = getNum(match, "allocated_credits")
		const totalFromApi = getNum(match, "total_credits", "initial_credits", "transferred_credits")
		const totalCredits = totalFromApi ?? allocated ?? remaining
		const usedFromApi = getNum(match, "used_credits", "used", "consumed_credits")
		const used =
			usedFromApi !== null
				? usedFromApi
				: totalCredits !== null && remaining !== null
					? Math.max(0, totalCredits - remaining)
					: null
		return {
			credits: remaining,
			totalCredits,
			usedCredits: used,
			raw: raw as SubOrgDetailsResponse,
		}
	}

	// Flat response: { total_credits, used_credits, remaining_credits }. Derive used = total - remaining when missing.
	const totalCredits =
		typeof raw.total_credits === "number" && Number.isFinite(raw.total_credits)
			? Math.floor(raw.total_credits)
			: null
	const credits =
		typeof raw.remaining_credits === "number" && Number.isFinite(raw.remaining_credits)
			? Math.floor(raw.remaining_credits)
			: null
	const usedCredits =
		typeof raw.used_credits === "number" && Number.isFinite(raw.used_credits)
			? Math.floor(raw.used_credits)
			: totalCredits !== null && credits !== null
				? Math.max(0, totalCredits - credits)
				: null
	return { credits, totalCredits, usedCredits, raw: raw as SubOrgDetailsResponse }
}

/**
 * Fetch current credits/balance for a DocOnChain sub-organization.
 * Prefer: generate token with sub-org clientKey/clientSecret + ENP email, then GET /organizations/credits.
 * Fallback: parent-org credits endpoint or GET sub-org details.
 */
export async function getDoconchainSubOrgCredits(input: {
	subOrganizationUuid: string
	clientKey?: string | null
	clientSecret?: string | null
	/** Email of an ENP in that sub-org (used to generate sub-org scoped token). Falls back to DOCONCHAIN_EMAIL. */
	enpEmail?: string | null
}): Promise<SubOrgCreditsResult> {
	const uuid = input.subOrganizationUuid.trim()
	if (!uuid) throw new Error("DocOnChain get sub-org credits requires subOrganizationUuid.")

	const email = (input.enpEmail ?? env.DOCONCHAIN_EMAIL).trim() || env.DOCONCHAIN_EMAIL

	// Prefer: sub-org clientKey + clientSecret + ENP email → generate token → GET /organizations/credits.
	if (input.clientKey && input.clientSecret && email) {
		try {
			const token = await getDoconchainApiTokenWithEnterpriseCreds({
				email,
				clientKey: input.clientKey,
				clientSecret: input.clientSecret,
			})
			return await fetchCreditsWithToken(token, uuid)
		} catch {
			// Fall through to parent-org or sub-org details.
		}
	}

	// Fallback: parent-org credits (main org in data[0], sub-orgs in data[0].sub_organizations).
	try {
		const orgCredits = await getDoconchainOrganizationCredits()
		const flat = flattenCreditsItems(orgCredits.items as CreditsDataItem[])
		const match = flat.find(row => {
			const rowUuid = String(row.uuid ?? "").trim()
			const rowId = String(row.id ?? "").trim()
			return rowUuid === uuid || (rowUuid && uuid === rowUuid) || (rowId && rowId === uuid)
		})
		if (match) {
			const remaining =
				typeof match.remaining_credits === "number"
					? match.remaining_credits
					: typeof match.allocated_credits === "number"
						? match.allocated_credits
						: null
			const allocated = typeof match.allocated_credits === "number" ? match.allocated_credits : null
			const totalFromApi =
				typeof match.total_credits === "number"
					? match.total_credits
					: typeof (match as CreditsDataItem).initial_credits === "number"
						? (match as CreditsDataItem).initial_credits
						: typeof (match as CreditsDataItem).transferred_credits === "number"
							? (match as CreditsDataItem).transferred_credits
							: null
			const totalCredits = totalFromApi ?? allocated ?? remaining
			const used =
				typeof match.used_credits === "number"
					? match.used_credits
					: totalCredits !== null && remaining !== null
						? Math.max(0, totalCredits - remaining)
						: null
			return {
				credits: remaining,
				totalCredits,
				usedCredits: used,
				raw: (orgCredits.raw ?? undefined) as SubOrgDetailsResponse | undefined,
			}
		}
		if (orgCredits.summary.remainingCredits !== null) {
			return {
				credits: orgCredits.summary.remainingCredits,
				totalCredits: orgCredits.summary.totalCredits,
				usedCredits: orgCredits.summary.usedCredits,
				raw: (orgCredits.raw ?? undefined) as SubOrgDetailsResponse | undefined,
			}
		}
	} catch {
		// Fall through to GET sub-org details.
	}

	// Legacy: GET sub-org details and parse credits from response.
	const url = new URL(`/api/v2/organizations/sub/${uuid}`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const doRequest = async (token: string): Promise<Response> =>
		fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
		})

	let token: string | null = null
	try {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	} catch {
		// ignore
	}
	if (!token) {
		return { credits: null, totalCredits: null, usedCredits: null }
	}
	let res = await doRequest(token)
	if (res.status === 401 && input.clientKey && input.clientSecret) {
		try {
			token = await getDoconchainApiTokenWithEnterpriseCreds({
				email: env.DOCONCHAIN_EMAIL,
				clientKey: input.clientKey,
				clientSecret: input.clientSecret,
			})
			res = await doRequest(token)
		} catch {
			// ignore
		}
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		return { credits: null, totalCredits: null, usedCredits: null }
	}

	const raw = (text ? (JSON.parse(text) as SubOrgDetailsResponse) : {}) as SubOrgDetailsResponse
	const data =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? "data" in raw && raw.data && typeof raw.data === "object"
				? (raw.data as Record<string, unknown>)
				: (raw as Record<string, unknown>)
			: ({} as Record<string, unknown>)

	const credits = getNumericCredits(data)
	// Parse total and used from sub-org details if present (same keys as elsewhere).
	const dataItem = data as CreditsDataItem
	const totalFromApi = getNum(
		dataItem,
		"total_credits",
		"initial_credits",
		"transferred_credits",
		"allocated_credits"
	)
	const totalCredits = totalFromApi ?? (credits !== null ? credits : null)
	const usedFromApi = getNum(dataItem, "used_credits", "used", "consumed_credits")
	const usedCredits =
		usedFromApi !== null
			? usedFromApi
			: totalCredits !== null && credits !== null
				? Math.max(0, totalCredits - credits)
				: null
	return { credits, totalCredits, usedCredits, raw }
}
