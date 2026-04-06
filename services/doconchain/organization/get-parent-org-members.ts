import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

export type MemberItem = {
	id?: number | string
	email?: string
	name?: string
	first_name?: string
	last_name?: string
	// some endpoints may return different keys; we keep this flexible
	firstName?: string
	lastName?: string
	user_email?: string
	user_id?: number | string
	member_id?: number | string
	/** DocOnChain move API expects this as memberId (org_client_data.client_id in profile). */
	client_id?: number | string
}
type ParentOrgMembersResponse = {
	message?: string
	data?: MemberItem[]
	members?: MemberItem[]
	users?: MemberItem[]
	items?: MemberItem[]
	meta?: unknown
}

async function doconchainGetWithAuth(url: URL): Promise<Response> {
	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await fetch(url.toString(), {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` },
	})
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		})
	}
	return res
}

/** Normalize a raw member object so it has id (client_id for move API) and email from common API key variants. */
function normalizeMember(raw: MemberItem): MemberItem {
	const r = raw as Record<string, unknown>
	// Move API expects client_id; member list may return id, client_id, user_id, or member_id
	const id = raw.client_id ?? raw.id ?? raw.user_id ?? raw.member_id
	const email = (raw.email ?? raw.user_email ?? r.email_address) as string | undefined
	return { ...raw, id, email }
}

function parseMembersFromText(text: string): MemberItem[] {
	if (!text) return []

	const asObj = JSON.parse(text) as ParentOrgMembersResponse
	const raw = Array.isArray(asObj?.data)
		? asObj.data
		: Array.isArray(asObj?.members)
			? asObj.members
			: Array.isArray(asObj?.users)
				? asObj.users
				: Array.isArray(asObj?.items)
					? asObj.items
					: Array.isArray(asObj as unknown)
						? (asObj as unknown as MemberItem[])
						: []
	return raw.map((m: MemberItem) => normalizeMember(m))
}

function buildMemberListUrls(organizationId: number): URL[] {
	const candidates: URL[] = []

	// Candidate 0: GET /organization/members (org inferred from token when same as default)
	{
		const url = new URL("/api/v2/organization/members", env.DOCONCHAIN_API_URL)
		url.searchParams.set("user_type", "ENTERPRISE_API")
		candidates.push(url)
	}

	// Candidate 1: GET /organization/members?organization_id=...
	{
		const url = new URL("/api/v2/organization/members", env.DOCONCHAIN_API_URL)
		url.searchParams.set("user_type", "ENTERPRISE_API")
		url.searchParams.set("organization_id", String(organizationId))
		candidates.push(url)
	}

	// Candidate 1b: GET /organization/members/list
	{
		const url = new URL("/api/v2/organization/members/list", env.DOCONCHAIN_API_URL)
		url.searchParams.set("user_type", "ENTERPRISE_API")
		candidates.push(url)
	}

	// Candidate 2: GET /organization/members/list?organization_id=...
	{
		const url = new URL("/api/v2/organization/members/list", env.DOCONCHAIN_API_URL)
		url.searchParams.set("user_type", "ENTERPRISE_API")
		url.searchParams.set("organization_id", String(organizationId))
		candidates.push(url)
	}

	// Candidate 3 (legacy): GET /organizations/{id}/members
	{
		const url = new URL(`/api/v2/organizations/${organizationId}/members`, env.DOCONCHAIN_API_URL)
		url.searchParams.set("user_type", "ENTERPRISE_API")
		candidates.push(url)
	}

	return candidates
}

async function fetchMembersWithCandidates(candidates: URL[]): Promise<MemberItem[]> {
	let lastError: { status?: number; text?: string } | null = null

	for (const url of candidates) {
		const res = await doconchainGetWithAuth(url)
		const text = await res.text().catch(() => "")

		if (res.ok) {
			return parseMembersFromText(text)
		}

		if (res.status === 404) {
			lastError = { status: res.status, text }
			continue
		}

		throw new Error(
			`DocOnChain get members failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	throw new Error(
		`DocOnChain get members failed (${lastError?.status ?? 404})${
			lastError?.text ? `: ${lastError.text.slice(0, 300)}` : ""
		}. Tried: ${candidates.map(u => u.pathname).join(", ")}`
	)
}

/**
 * List members of a specific DocOnChain organization (parent or sub-org) by numeric ID.
 * Used to find a member by email when they may be in the parent or in another sub-org.
 */
export async function getMembersForOrganization(organizationId: number): Promise<MemberItem[]> {
	const candidates = buildMemberListUrls(organizationId)
	return fetchMembersWithCandidates(candidates)
}

function withPagingParams(url: URL, page: number, perPage: number): URL {
	const u = new URL(url.toString())
	u.searchParams.set("page", String(page))
	u.searchParams.set("per_page", String(perPage))
	return u
}

/**
 * Find a member "id" by email within a specific org, trying paging.
 * DocOnChain member lists are frequently paginated; without paging we can miss users.
 *
 * IMPORTANT: Our `normalizeMember()` maps `id` to `client_id` when present, which is the value
 * the move endpoint expects as `{memberId}`.
 */
export async function findOrganizationMemberIdByEmail(input: {
	organizationId: number
	email: string
	maxPages?: number
	perPage?: number
}): Promise<number | null> {
	const wantEmail = input.email.trim().toLowerCase()
	if (!wantEmail) return null

	const perPage = input.perPage ?? 200
	const maxPages = input.maxPages ?? 25

	const baseCandidates = buildMemberListUrls(input.organizationId)

	for (const base of baseCandidates) {
		// Try paging first (common case)
		for (let page = 1; page <= maxPages; page++) {
			const url = withPagingParams(base, page, perPage)
			const res = await doconchainGetWithAuth(url)
			const text = await res.text().catch(() => "")

			if (res.status === 404) break // endpoint doesn't exist; move to next base candidate

			if (res.status === 400) {
				// Some endpoints don't accept page/per_page; fall back to non-paged call for this base
				break
			}

			if (!res.ok) {
				throw new Error(
					`DocOnChain get members failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
				)
			}

			const list = parseMembersFromText(text)
			const id = findParentOrgMemberIdByEmail(list, wantEmail)
			if (id !== null) return id

			// Heuristic stop: last page
			if (list.length < perPage) break
		}

		// Non-paged fallback for this base candidate
		{
			const res = await doconchainGetWithAuth(base)
			const text = await res.text().catch(() => "")
			if (res.status === 404) continue
			if (!res.ok) {
				throw new Error(
					`DocOnChain get members failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
				)
			}
			const list = parseMembersFromText(text)
			const id = findParentOrgMemberIdByEmail(list, wantEmail)
			if (id !== null) return id
		}
	}

	return null
}

/**
 * Fetch all members for an organization, paging when supported.
 * Useful for displaying members in the UI.
 */
export async function getOrganizationMembersAll(input: {
	organizationId: number
	maxPages?: number
	perPage?: number
}): Promise<MemberItem[]> {
	const perPage = input.perPage ?? 200
	const maxPages = input.maxPages ?? 25

	const baseCandidates = buildMemberListUrls(input.organizationId)
	const collected: MemberItem[][] = []

	for (const base of baseCandidates) {
		let pagedWorked = false

		for (let page = 1; page <= maxPages; page++) {
			const url = withPagingParams(base, page, perPage)
			const res = await doconchainGetWithAuth(url)
			const text = await res.text().catch(() => "")

			if (res.status === 404) break
			if (res.status === 400) break

			if (!res.ok) {
				throw new Error(
					`DocOnChain get members failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
				)
			}

			pagedWorked = true
			const list = parseMembersFromText(text)
			collected.push(list)
			if (list.length < perPage) break
		}

		if (pagedWorked) continue

		// Fallback: non-paged
		{
			const res = await doconchainGetWithAuth(base)
			const text = await res.text().catch(() => "")
			if (res.status === 404) continue
			if (!res.ok) {
				throw new Error(
					`DocOnChain get members failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
				)
			}
			collected.push(parseMembersFromText(text))
		}
	}

	return mergeMembersById(...collected)
}

/**
 * List members of the parent DocOnChain organization so we can get memberId by email
 * (e.g. for "move member to sub-org").
 *
 * NOTE: DocOnChain staging environments may not expose `/organizations/{id}/members`.
 * We try multiple known member-list routes under `/organization/members...`.
 */
export async function getParentOrgMembers(): Promise<MemberItem[]> {
	const candidates = buildMemberListUrls(env.DOCONCHAIN_ORGANIZATION_ID)
	return fetchMembersWithCandidates(candidates)
}

/**
 * Try to list all members for the current org (no organization_id).
 * Some DocOnChain environments return the full org tree from this endpoint.
 * Returns [] if the endpoint is not available (e.g. 404).
 */
export async function getMembersListAll(): Promise<MemberItem[]> {
	const candidates: URL[] = [
		new URL("/api/v2/organization/members", env.DOCONCHAIN_API_URL),
		new URL("/api/v2/organization/members/list", env.DOCONCHAIN_API_URL),
	]
	for (const url of candidates) {
		url.searchParams.set("user_type", "ENTERPRISE_API")
	}
	for (const url of candidates) {
		try {
			const res = await doconchainGetWithAuth(url)
			const text = await res.text().catch(() => "")
			if (res.ok) return parseMembersFromText(text)
			if (res.status === 404) continue
		} catch {
			continue
		}
	}
	return []
}

/**
 * Fetch members for multiple organizations (e.g. parent + all sub-orgs) and merge into one list.
 * Deduplicates by member id so we can find a user by email wherever they currently are.
 */
export async function getMembersAcrossOrganizations(
	organizationIds: number[]
): Promise<MemberItem[]> {
	const results = await Promise.all(
		organizationIds.map(id => getMembersForOrganization(id).catch(() => [] as MemberItem[]))
	)
	return mergeMembersById(...results)
}

/** Merge multiple member lists by id (first occurrence wins). */
export function mergeMembersById(...lists: MemberItem[][]): MemberItem[] {
	const byId = new Map<number | string, MemberItem>()
	for (const list of lists) {
		for (const m of list) {
			if (m.id !== null && m.id !== undefined && !byId.has(m.id)) byId.set(m.id, m)
		}
	}
	return [...byId.values()]
}

/**
 * Try every way we know to get members (list-all, parent, per-org) and merge.
 * Use when we need to find a member by email and they may exist in any org we manage.
 */
export async function getAllMembersForLookup(organizationIds: number[]): Promise<MemberItem[]> {
	const [listAll, parentMembers, acrossOrgs] = await Promise.all([
		getMembersListAll(),
		getParentOrgMembers().catch(() => [] as MemberItem[]),
		getMembersAcrossOrganizations(organizationIds),
	])
	return mergeMembersById(listAll, parentMembers, acrossOrgs)
}

/** Find parent-org member id by email (case-insensitive). */
export function findParentOrgMemberIdByEmail(members: MemberItem[], email: string): number | null {
	const want = email.trim().toLowerCase()
	for (const m of members) {
		const e = (m.email ?? "").trim().toLowerCase()
		if (!e || e !== want || m.id === null) continue

		if (typeof m.id === "number") return m.id
		const parsed = Number.parseInt(String(m.id), 10)
		if (Number.isFinite(parsed)) return parsed
	}
	return null
}
