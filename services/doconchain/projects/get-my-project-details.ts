import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"
import type { GetSubOrgCredsForEmail } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type DoconchainMyProjectDetailsResponse = {
	message?: string
	data?: {
		uuid?: string
		status?: string
		completed_at?: string | null
		file_name?: string
		name?: string
		files?: Array<{
			id?: number | string
			file_name?: string | null
			type?: string | null
			url?: string | null
			file_url?: string | null
			[key: string]: unknown
		}>
		[key: string]: unknown
	}
	[key: string]: unknown
}

async function fetchMyProjectDetails(params: {
	projectUuid: string
	token: string
}): Promise<DoconchainMyProjectDetailsResponse> {
	const url = new URL(`/my/projects/${params.projectUuid}`, env.DOCONCHAIN_API_URL)
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
			`DocOnChain get my project details failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return text ? (JSON.parse(text) as DoconchainMyProjectDetailsResponse) : {}
}

export async function getDoconchainMyProjectDetails(input: {
	projectUuid: string
	email: string
	/** Optional: resolve sub-org enterprise creds for this token email (usually the ENP owner). */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<DoconchainMyProjectDetailsResponse> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("Email is required to fetch my project details.")

	const doRequest = async () => {
		// Prefer explicit user-token (DOCONCHAIN_API_TOKEN) if configured; otherwise generate.
		const token = await getDoconchainApiToken({
			email,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		return fetchMyProjectDetails({ projectUuid, token })
	}

	try {
		return doRequest()
	} catch (error) {
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			const invalidate = invalidateDoconchainToken as (email: string) => void
			invalidate(email)
			return doRequest()
		}
		throw error
	}
}
