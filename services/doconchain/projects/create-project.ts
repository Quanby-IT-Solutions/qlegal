import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
	type GetSubOrgCredsForEmail,
} from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type DoconchainCreateProjectResponse = {
	message?: string
	data?: {
		uuid?: string
		id?: number
		url?: string
		file_name?: string
		reference_number?: string
		status?: string
		created_at?: string
		updated_at?: string
	}
}

async function postCreateProject(params: {
	token: string
	fileBuffer: Buffer
	filename: string
	mimeType: string
	userListEditable?: boolean
	creatorAsViewer?: boolean
	documentStamp?: unknown
}): Promise<DoconchainCreateProjectResponse> {
	const url = new URL("/api/v2/projects", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const body = new FormData()

	// undici FormData: use append() to include filename for Blob/Buffer parts
	const blob = new Blob([new Uint8Array(params.fileBuffer)], { type: params.mimeType })
	body.append("file", blob, params.filename)

	if (params.userListEditable !== undefined) {
		body.set("user_list_editable", String(params.userListEditable))
	}
	if (params.creatorAsViewer !== undefined) {
		body.set("creator_as_viewer", String(params.creatorAsViewer))
	}
	if (params.documentStamp !== undefined) {
		body.set("document_stamp", JSON.stringify(params.documentStamp))
	}

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.token}`,
		},
		body,
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const err = new Error(
			`DocOnChain create project failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return text ? (JSON.parse(text) as DoconchainCreateProjectResponse) : {}
}

export async function createDoconchainProject(input: {
	enpEmail: string
	fileBuffer: Buffer
	filename: string
	mimeType: string
	userListEditable?: boolean
	creatorAsViewer?: boolean
	documentStamp?: unknown
	/** Optional: resolve sub-org enterprise creds for this ENP to avoid unauthorized parent-org token flows. */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<{ uuid: string; url: string | null; raw: DoconchainCreateProjectResponse }> {
	const email = input.enpEmail.trim().toLowerCase()
	if (!email) {
		throw new Error("ENP email is required to create a DocOnChain project.")
	}

	const doRequest = async (): Promise<DoconchainCreateProjectResponse> => {
		const token = await getDoconchainApiToken({
			email,
			forceGenerated: true,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		return postCreateProject({
			token,
			fileBuffer: input.fileBuffer,
			filename: input.filename,
			mimeType: input.mimeType,
			userListEditable: input.userListEditable,
			creatorAsViewer: input.creatorAsViewer,
			documentStamp: input.documentStamp,
		})
	}

	try {
		const raw = await doRequest()
		const uuid = raw.data?.uuid
		if (!uuid) {
			throw new Error("DocOnChain create project response missing data.uuid.")
		}
		return { uuid, url: raw.data?.url ?? null, raw }
	} catch (error) {
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		// If token is expired/invalid, invalidate and retry once with a fresh token.
		if (status === 401) {
			invalidateDoconchainToken(email)
			const raw = await doRequest()
			const uuid = raw.data?.uuid
			if (!uuid) {
				throw new Error("DocOnChain create project response missing data.uuid.")
			}
			return { uuid, url: raw.data?.url ?? null, raw }
		}
		throw error
	}
}
