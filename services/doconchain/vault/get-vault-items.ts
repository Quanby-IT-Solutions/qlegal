import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"
import type { GetSubOrgCredsForEmail } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type DoconchainVaultItem = {
	id?: number
	uuid?: string
	project_uuid?: string
	name?: string
	file_name?: string
	size?: string
	status?: string
	created_at?: string
	actions?: string[]
	contents?: unknown[]
	// allow extra fields without over-typing
	[key: string]: unknown
}

type DoconchainVaultItemsResponse = {
	message?: string
	data?: DoconchainVaultItem[]
	meta?: {
		total?: number
		per_page?: number
		first_page?: number
		last_page?: number
		current_page?: number
		[key: string]: unknown
	}
}

function parseYesNo(v: unknown, defaultValue: "yes" | "no"): "yes" | "no" {
	if (v === "yes" || v === "no") return v
	return defaultValue
}

async function fetchVaultItems(params: {
	token: string
	perPage: number
	page: number
	userItemsOnly: "yes" | "no"
	apiIntegratedProjectsOnly: "yes" | "no"
}): Promise<DoconchainVaultItemsResponse> {
	const url = new URL("/vault/items", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")
	url.searchParams.set("per_page", String(params.perPage))
	url.searchParams.set("page", String(params.page))
	url.searchParams.set("user_items_only", params.userItemsOnly)
	url.searchParams.set("api_integrated_projects_only", params.apiIntegratedProjectsOnly)

	const res = await fetch(url.toString(), {
		method: "GET",
		headers: {
			accept: "application/json",
			authorization: `Bearer ${params.token}`,
		},
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const err = new Error(
			`DocOnChain vault/items failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return (
		text ? (JSON.parse(text) as DoconchainVaultItemsResponse) : {}
	) as DoconchainVaultItemsResponse
}

export async function getDoconchainVaultItems(input: {
	email: string
	perPage?: number
	page?: number
	userItemsOnly?: "yes" | "no"
	apiIntegratedProjectsOnly?: "yes" | "no"
	/** Optional: resolve sub-org enterprise creds for this token email (usually the ENP owner). */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<{ items: DoconchainVaultItem[]; meta: DoconchainVaultItemsResponse["meta"] }> {
	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("Email is required to fetch vault items.")

	const perPage = Number.isFinite(input.perPage)
		? Math.max(1, Math.min(100, input.perPage ?? 15))
		: 15
	const page = Number.isFinite(input.page) ? Math.max(1, input.page ?? 1) : 1
	const userItemsOnly = parseYesNo(input.userItemsOnly, "no")
	const apiIntegratedProjectsOnly = parseYesNo(input.apiIntegratedProjectsOnly, "no")

	const doRequest = async () => {
		// Prefer explicit user-token (DOCONCHAIN_API_TOKEN) if configured; otherwise generate.
		const token = await getDoconchainApiToken({
			email,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		return await fetchVaultItems({ token, perPage, page, userItemsOnly, apiIntegratedProjectsOnly })
	}

	try {
		const res = await doRequest()
		return { items: res.data ?? [], meta: res.meta }
	} catch (error) {
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			invalidateDoconchainToken(email)
			const res = await doRequest()
			return { items: res.data ?? [], meta: res.meta }
		}
		throw error
	}
}
