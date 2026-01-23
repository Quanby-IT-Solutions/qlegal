import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { createProjectResponseSchema } from "../lib/schemas"
import { normalizeUrl } from "../lib/utils"

interface DocumentStamp {
	seal?: {
		type: string
		enp_name?: string
		enp_role_number?: string
		[key: string]: unknown
	}
	notary_info?: {
		type: string
		atty_name?: string
		[key: string]: unknown
	}
}

interface CreateProjectRequest {
	title: string
	documentFile: Buffer
	fileName: string
	creatorEmail: string
	userListEditable?: boolean
	creatorAsViewer?: boolean
	documentStamp?: DocumentStamp
}

export async function createProject({
	title,
	documentFile,
	fileName,
	creatorEmail,
	userListEditable = true,
	creatorAsViewer = true,
	documentStamp,
}: CreateProjectRequest): Promise<{ uuid: string; id?: string | number; redirectUrl?: string }> {
	const formData = new FormData()
	const documentBlob = new Blob([new Uint8Array(documentFile)], { type: "application/pdf" })
	formData.append("file", documentBlob, fileName)
	formData.append("title", title)
	formData.append("project_type", "SignatureRequest")
	formData.append("api", "true")
	formData.append("user_list_editable", userListEditable ? "true" : "false")
	formData.append("creator_as_viewer", creatorAsViewer ? "true" : "false")

	if (documentStamp) {
		formData.append("document_stamp", JSON.stringify(documentStamp))
	}

	const response = await apiCall(async token => {
		return fetch(`${env.DOCONCHAIN_API_URL}/api/v2/projects?user_type=ENTERPRISE_API`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
			body: formData,
		})
	}, creatorEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const json: unknown = await response.json()
	const result = createProjectResponseSchema.parse(json)

	if (!result.data?.uuid) {
		throw new Error("doconchain did not return a project UUID")
	}

	return {
		uuid: result.data.uuid,
		id: result.data.id,
		redirectUrl: result.data.redirect_url
			? (normalizeUrl(result.data.redirect_url) ?? undefined)
			: undefined,
	}
}

export async function getProjectDetails(
	projectUuid: string,
	userEmail?: string
): Promise<{
	data?: {
		uuid?: string
		project_uuid?: string
		id?: number | string
		status?: string
		completed_at?: string | null
		file_name?: string | null
		name?: string | null
		signers?: Array<{
			id?: number | string
			email?: string
			first_name?: string | null
			last_name?: string | null
			status?: string
			signed_at?: string | null
			sequence?: number
			signer_role?: string
		}>
		signed_url?: string | null
		signed_document_url?: string | null
		url?: string | null
		certificate_url?: string | null
		certificateUrl?: string | null
		cert_url?: string | null
		redirect_url?: string | null
		sent_at?: string | null
	}
	message?: string
}> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}?user_type=ENTERPRISE_API`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		let errorMessage = `doconchain API error: ${response.status} ${response.statusText}`
		try {
			const errorJson = JSON.parse(errorText) as { message?: string }
			if (errorJson.message) errorMessage = errorJson.message
		} catch {
			if (errorText) errorMessage = errorText
		}
		throw new Error(errorMessage)
	}

	return (await response.json()) as {
		data?: {
			uuid?: string
			project_uuid?: string
			id?: number | string
			status?: string
			completed_at?: string | null
			file_name?: string | null
			name?: string | null
			signers?: Array<{
				id?: number | string
				email?: string
				first_name?: string | null
				last_name?: string | null
				status?: string
				signed_at?: string | null
				sequence?: number
				signer_role?: string
			}>
			signed_url?: string | null
			signed_document_url?: string | null
			url?: string | null
			certificate_url?: string | null
			certificateUrl?: string | null
			cert_url?: string | null
			redirect_url?: string | null
			sent_at?: string | null
		}
		message?: string
	}
}

interface AddSignatureMarkRequest {
	projectUuid: string
	signerId: number
	type: string
	position_x: number
	position_y: number
	height: number
	width: number
	page_no: number
}

export async function addSignatureMark({
	projectUuid,
	signerId,
	type,
	position_x,
	position_y,
	height,
	width,
	page_no,
}: AddSignatureMarkRequest): Promise<Record<string, unknown>> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/projects/${projectUuid}/signers/${signerId}/properties?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({ type, position_x, position_y, height, width, page_no }),
			}
		)
	})

	if (!response.ok) {
		throw new Error(`doconchain API error: ${response.status} ${response.statusText}`)
	}

	return (await response.json()) as Record<string, unknown>
}

export async function sendProject(
	projectUuid: string,
	userEmail?: string
): Promise<Record<string, unknown>> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/my/projects/${projectUuid}/send?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as Record<string, unknown>
}
