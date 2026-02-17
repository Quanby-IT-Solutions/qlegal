import { env } from "@/env"
import { getDoconchainApiToken, invalidateDoconchainToken } from "@/services/doconchain/auth/generate-token"

type DoconchainProjectDetailsResponse = {
	message?: string
	data?: {
		uuid?: string
		status?: string
		completed_at?: string | null
		file_name?: string
		name?: string
		[key: string]: unknown
	}
	[key: string]: unknown
}

async function fetchProjectDetails(params: {
	projectUuid: string
	token: string
}): Promise<DoconchainProjectDetailsResponse> {
	const url = new URL(`/api/v2/projects/${params.projectUuid}`, env.DOCONCHAIN_API_URL)
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
			`DocOnChain get project details failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return text ? (JSON.parse(text) as DoconchainProjectDetailsResponse) : {}
}

export async function getDoconchainProjectDetails(input: {
	projectUuid: string
	email: string
}): Promise<{ projectStatus: string | null; completedAt: string | null; raw: DoconchainProjectDetailsResponse }> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("Email is required to fetch project details.")

	const doRequest = async () => {
		// Prefer explicit user-token (DOCONCHAIN_API_TOKEN) if configured; otherwise generate.
		const token = await getDoconchainApiToken({ email })
		return fetchProjectDetails({ projectUuid, token })
	}

	try {
		const raw = await doRequest()
		const status = typeof raw.data?.status === "string" ? raw.data.status : null
		const completedAt = typeof raw.data?.completed_at === "string" ? raw.data.completed_at : null
		return { projectStatus: status, completedAt, raw }
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			const invalidate = invalidateDoconchainToken as (email: string) => void
			invalidate(email)
			const raw = await doRequest()
			const s = typeof raw.data?.status === "string" ? raw.data.status : null
			const completedAt = typeof raw.data?.completed_at === "string" ? raw.data.completed_at : null
			return { projectStatus: s, completedAt, raw }
		}
		throw error
	}
}

