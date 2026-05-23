import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"
import type { GetSubOrgCredsForEmail } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type DoconchainVaultProject = {
	uuid?: string
	project_uuid?: string
	status?: string
	name?: string
	file_name?: string
	completed_at?: string
	files?: Array<{ file_id?: number; file_name?: string; file_url?: string }>
	signers?: Array<{ signer_id?: number; name?: string; email?: string; status?: string }>
	setting?: Record<string, unknown>
	[key: string]: unknown
}

type DoconchainVaultItemResponse = {
	message?: string
	data?: DoconchainVaultProject | null
	meta?: Record<string, unknown>
}

async function fetchVaultItem(params: {
	token: string
	uuid: string
}): Promise<DoconchainVaultItemResponse> {
	const url = new URL(`/vault/items/${params.uuid}`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

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
			`DocOnChain vault/items/:uuid failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return (
		text ? (JSON.parse(text) as DoconchainVaultItemResponse) : {}
	) as DoconchainVaultItemResponse
}

export async function getDoconchainVaultItem(input: {
	email: string
	uuid: string
	/** Optional: resolve sub-org enterprise creds for this token email (usually the ENP owner). */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<{ item: DoconchainVaultProject | null; isCompleted: boolean }> {
	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("Email is required to fetch a vault item.")
	const uuid = input.uuid.trim()
	if (!uuid) throw new Error("Vault item uuid is required.")

	const doRequest = async () => {
		// Prefer explicit user-token (DOCONCHAIN_API_TOKEN) if configured; otherwise generate.
		const token = await getDoconchainApiToken({
			email,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		return await fetchVaultItem({ token, uuid })
	}

	try {
		const res = await doRequest()
		const item = res.data ?? null
		const status = typeof item?.status === "string" ? item.status.toLowerCase() : ""
		return { item, isCompleted: status === "completed" }
	} catch (error) {
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			invalidateDoconchainToken(email)
			const res = await doRequest()
			const item = res.data ?? null
			const s = typeof item?.status === "string" ? item.status.toLowerCase() : ""
			return { item, isCompleted: s === "completed" }
		}
		throw error
	}
}
