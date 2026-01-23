import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { type Signer } from "../lib/schemas"
import { getPassportDocument } from "./passport"
import { getProjectDetails } from "./project"
import { getVaultItem } from "./vault"

interface SigningStatusResult {
	isFullySigned: boolean
	projectStatus: string
	completedAt: string | null
	totalSigners: number
	signedCount: number
	signers: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
}

export async function checkSigningStatus(
	projectUuid: string,
	userEmail?: string
): Promise<SigningStatusResult> {
	const projectDetails = await getProjectDetails(projectUuid, userEmail)
	const projectData = projectDetails?.data

	if (!projectData) {
		throw new Error("Project not found or invalid response")
	}

	const signers = (projectData.signers as Signer[]) ?? []
	const signedSigners = signers.filter(s => s.status === "SIGNED" || s.signed_at !== null)

	const isFullySigned =
		signers.length > 0 &&
		signedSigners.length === signers.length &&
		(projectData.status === "Completed" || projectData.completed_at !== null)

	return {
		isFullySigned,
		projectStatus: projectData.status ?? "Unknown",
		completedAt: (projectData.completed_at as string | null) ?? null,
		totalSigners: signers.length,
		signedCount: signedSigners.length,
		signers: signers.map(s => ({
			id: typeof s.id === "number" ? s.id : Number.parseInt(String(s.id), 10),
			email: s.email,
			firstName: s.first_name ?? "",
			lastName: s.last_name ?? "",
			status: s.status ?? "PENDING",
			signedAt: s.signed_at ?? null,
			sequence: s.sequence ?? 0,
			signerRole: s.signer_role ?? s.role ?? "SIGNER",
		})),
	}
}

export async function downloadSignedDocument(
	projectUuid: string,
	userEmail?: string
): Promise<{ buffer: Buffer; fileName: string; url: string }> {
	const projectDetails = await getProjectDetails(projectUuid, userEmail)
	const projectData = projectDetails?.data

	if (!projectData) {
		throw new Error("Project not found or invalid response")
	}

	const signers = (projectData.signers as Signer[]) ?? []
	const signedSigners = signers.filter(s => s.status === "SIGNED" || s.signed_at !== null)
	const isFullySigned =
		signers.length > 0 &&
		signedSigners.length === signers.length &&
		(projectData.status === "Completed" || projectData.completed_at !== null)

	if (!isFullySigned) {
		throw new Error(
			"Document is not fully signed yet. All signers must complete signing before downloading."
		)
	}

	let signedDocumentUrl: string | null = null
	let buffer: Buffer | null = null
	const downloadApiUrl = `${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/download?user_type=ENTERPRISE_API`

	// Method 1: Vault files
	if (!buffer) {
		try {
			const rawVaultUuid = projectData.uuid ?? projectData.project_uuid
			const vaultUuid = rawVaultUuid ? String(rawVaultUuid) : projectUuid

			const vaultItem = await getVaultItem(vaultUuid, userEmail)
			const vaultFiles =
				(vaultItem?.data?.files as Array<{
					file_url?: string
					url?: string
					file_name?: string
					name?: string
					type?: string
					tab?: string
				}>) ?? []

			const rawFileName = projectData.file_name
			const rawName = projectData.name
			const projectFileName = (
				typeof rawFileName === "string" ? rawFileName : typeof rawName === "string" ? rawName : ""
			).trim()
			const matchingByName =
				projectFileName.length > 0
					? vaultFiles.find(f => String(f.file_name ?? f.name ?? "").trim() === projectFileName)
					: undefined

			const sealedOrSignedLike = vaultFiles.find(f => {
				const type = String(f.type ?? "").toLowerCase()
				const tab = String(f.tab ?? "").toLowerCase()
				const name = String(f.name ?? "").toLowerCase()
				const fileName = String(f.file_name ?? "").toLowerCase()
				return (
					type.includes("seal") ||
					type.includes("signed") ||
					tab.includes("seal") ||
					tab.includes("signed") ||
					name.includes("seal") ||
					name.includes("signed") ||
					fileName.includes("seal") ||
					fileName.includes("signed")
				)
			})

			const selectedFile = matchingByName ?? sealedOrSignedLike ?? vaultFiles[0]
			const vaultFileUrl = selectedFile?.file_url ?? selectedFile?.url

			if (vaultFileUrl) {
				let fileResp = await fetch(vaultFileUrl)

				if (!fileResp.ok && (fileResp.status === 401 || fileResp.status === 403)) {
					fileResp = await apiCall(async token => {
						return fetch(vaultFileUrl, {
							method: "GET",
							headers: {
								Authorization: `Bearer ${token}`,
								Accept: "application/pdf",
							},
						})
					}, userEmail)
				}

				if (fileResp.ok) {
					const arrayBuffer = await fileResp.arrayBuffer()
					buffer = Buffer.from(arrayBuffer)
					signedDocumentUrl = vaultFileUrl
				}
			}
		} catch {
			// Vault endpoint failed
		}
	}

	// Method 2: API download endpoint
	if (!buffer) {
		try {
			const apiResponse = await apiCall(async token => {
				return fetch(downloadApiUrl, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/pdf",
					},
				})
			}, userEmail)

			if (apiResponse.ok) {
				const arrayBuffer = await apiResponse.arrayBuffer()
				buffer = Buffer.from(arrayBuffer)
				signedDocumentUrl = downloadApiUrl
			}
		} catch {
			// API download failed
		}
	}

	// Method 3: Fallback URLs
	if (!buffer) {
		const fallbackUrl =
			(projectData.signed_url as string | undefined) ??
			(projectData.signed_document_url as string | undefined) ??
			(projectData.url as string | undefined)

		if (!fallbackUrl) {
			throw new Error("Signed document URL not available. Document may not be fully signed yet.")
		}

		const response = await fetch(fallbackUrl)

		if (!response.ok) {
			throw new Error(
				`Failed to download signed document: ${response.status} ${response.statusText}`
			)
		}

		const arrayBuffer = await response.arrayBuffer()
		buffer = Buffer.from(arrayBuffer)
		signedDocumentUrl = fallbackUrl
	}

	if (!buffer) {
		throw new Error("Failed to download signed document: No valid download method succeeded")
	}

	const fileName =
		(projectData.file_name as string | undefined) ??
		(projectData.name as string | undefined) ??
		`signed-document-${projectUuid}.pdf`

	return {
		buffer,
		fileName,
		url: signedDocumentUrl ?? downloadApiUrl,
	}
}

export async function downloadCertificate(
	projectUuid: string,
	userEmail?: string
): Promise<{ buffer: Buffer; fileName: string; url: string }> {
	const maxRetries = 3
	const retryDelayMs = 2000

	const attemptToGetCertificateUrl = async (attempt: number): Promise<string | null> => {
		if (attempt > 1) {
			await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt - 1)))
		}

		try {
			const projectDetails = await getProjectDetails(projectUuid, userEmail)
			const projectData = projectDetails?.data

			if (!projectData) return null

			let certificateUrl: string | undefined =
				(projectData.certificate_url as string | undefined) ??
				(projectData.certificateUrl as string | undefined) ??
				(projectData.cert_url as string | undefined)

			if (!certificateUrl) {
				try {
					const passportData = await getPassportDocument(projectUuid, "certificate_url", userEmail)

					if (typeof passportData === "string" && passportData.startsWith("http")) {
						certificateUrl = passportData
					} else if (typeof passportData === "object" && passportData !== null) {
						const data = passportData.data as
							| {
									certificate_url?: string
									certificateUrl?: string
									cert_url?: string
									url?: string
							  }
							| undefined
						const urlProp = passportData.url as string | undefined
						const certUrlProp = passportData.certificate_url as string | undefined
						const certUrlProp2 = passportData.certificateUrl as string | undefined
						const certUrlProp3 = passportData.cert_url as string | undefined
						const dataString = typeof passportData.data === "string" ? passportData.data : undefined

						certificateUrl =
							data?.certificate_url ??
							data?.certificateUrl ??
							data?.cert_url ??
							data?.url ??
							certUrlProp ??
							certUrlProp2 ??
							certUrlProp3 ??
							urlProp ??
							(dataString?.startsWith("http") ? dataString : undefined)
					}
				} catch {
					// Failed to get certificate URL from Passport API
				}
			}

			return certificateUrl ?? null
		} catch {
			return null
		}
	}

	let certificateUrl: string | null = null
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		certificateUrl = await attemptToGetCertificateUrl(attempt)
		if (certificateUrl) break
	}

	if (!certificateUrl) {
		const possibleEndpoints = [
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
			`${env.DOCONCHAIN_API_URL}/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/certificate/download?user_type=ENTERPRISE_API`,
			`${env.DOCONCHAIN_API_URL}/my/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
			`${env.DOCONCHAIN_APP_URL}/api/v2/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
			`${env.DOCONCHAIN_APP_URL}/projects/${projectUuid}/certificate`,
		]

		for (const endpoint of possibleEndpoints) {
			try {
				const response = await apiCall(async token => {
					return fetch(endpoint, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/pdf",
						},
					})
				}, userEmail)

				if (response.ok) {
					const arrayBuffer = await response.arrayBuffer()
					const buffer = Buffer.from(arrayBuffer)
					return { buffer, fileName: `certificate-${projectUuid}.pdf`, url: endpoint }
				}
			} catch {
				continue
			}
		}

		throw new Error(
			"Certificate download endpoint not available. " +
				"The certificate may be embedded in the signed PDF document. " +
				"Please download the signed document to access the certificate."
		)
	}

	const response = await apiCall(async token => {
		return fetch(certificateUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/pdf",
			},
		})
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Failed to download certificate: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const arrayBuffer = await response.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)

	return {
		buffer,
		fileName: `certificate-${projectUuid}.pdf`,
		url: certificateUrl,
	}
}

interface GetProcessingCompletedOptions {
	page?: number
	perPage?: number
	email?: string
	sort?: string
	order?: "asc" | "desc"
	status?: "processing" | "completed"
	userItemsOnly?: boolean
	apiIntegratedProjectsOnly?: boolean
	getProjectsByOrganization?: boolean
}

interface ProcessingCompletedProject {
	id: number
	uuid: string
	name: string
	status: string
	created_at: string
	updated_at: string
	project_uuid?: string
	[key: string]: unknown
}

interface ProcessingCompletedResponse {
	message: string
	data: ProcessingCompletedProject[]
	meta?: {
		total: number
		per_page: number
		first_page: number
		last_page: number
		current_page: number
	}
}

export async function getProcessingCompletedProjects(
	userEmail: string,
	options: GetProcessingCompletedOptions = {}
): Promise<ProcessingCompletedResponse> {
	const {
		page = 1,
		perPage = 100,
		email,
		sort,
		order,
		status = "completed",
		userItemsOnly = false,
		apiIntegratedProjectsOnly = true,
		getProjectsByOrganization = false,
	} = options

	const params = new URLSearchParams({
		user_type: "ENTERPRISE_API",
		page: String(page),
		per_page: String(perPage),
		status,
		user_items_only: userItemsOnly ? "yes" : "no",
		api_integrated_projects_only: apiIntegratedProjectsOnly ? "yes" : "no",
		get_projects_by_organization: getProjectsByOrganization ? "yes" : "no",
	})

	if (email) params.append("email", email)
	if (sort) params.append("sort", sort)
	if (order) params.append("order", order)

	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/templates/processing-completed?${params.toString()}`,
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
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as ProcessingCompletedResponse
}
