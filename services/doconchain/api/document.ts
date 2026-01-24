import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { type Signer } from "../lib/schemas"
import { getPassportDocument } from "./passport"
import { getMyProjectDetails, getProjectDetails } from "./project"
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
	// Helper function to check if a signer has signed (case-insensitive)
	const isSignerSigned = (s: Signer): boolean => {
		const statusUpper = (s.status ?? "").toUpperCase()
		const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
		const hasSignedAt = s.signed_at !== null && s.signed_at !== undefined && s.signed_at !== ""
		return hasSignedStatus || hasSignedAt
	}
	const signedSigners = signers.filter(isSignerSigned)

	const projectStatusUpper = ((projectData.status as string) ?? "").toUpperCase()
	const isFullySigned =
		signers.length > 0 &&
		signedSigners.length === signers.length &&
		(projectStatusUpper === "COMPLETED" || projectData.completed_at !== null)

	return {
		isFullySigned,
		projectStatus: (projectData.status as string) ?? "Unknown",
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
	// First, try to get project details from /my/projects endpoint (includes files array with signed/sealed documents)
	let signedDocumentUrl: string | null = null
	let buffer: Buffer | null = null
	let projectFileName: string | null = null

	try {
		console.log("🔵 Getting project details from /my/projects endpoint...")
		const myProjectDetails = await getMyProjectDetails(projectUuid, userEmail)
		const myProjectData = myProjectDetails?.data

		if (myProjectData) {
			projectFileName = (myProjectData.file_name ?? myProjectData.name ?? null) as string | null

			// Check project status - if completed, prefer download API endpoint for sealed document
			const projectStatus = String(myProjectData.status ?? "").toLowerCase()
			const isCompleted = projectStatus === "completed" || myProjectData.completed_at !== null

			// For completed projects, skip files array and use download API endpoint
			// which ensures we get the document with all seals and certificates properly applied
			if (!isCompleted) {
				// For non-completed projects, try to find signed file in files array
				const files = (myProjectData.files as Array<{
					id?: number | string
					file_name?: string | null
					type?: string | null
					url?: string | null
				}>) ?? []

				// Find signed/sealed document (exclude Original, Meta, QR types)
				const signedFile = files.find(file => {
					const type = String(file.type ?? "").toLowerCase()
					const fileName = String(file.file_name ?? "").toLowerCase()
					return (
						type !== "original" &&
						type !== "meta" &&
						type !== "qr" &&
						!fileName.includes("original") &&
						!fileName.includes("meta") &&
						!fileName.includes("qr") &&
						(type.includes("signed") ||
							type.includes("seal") ||
							type.includes("completed") ||
							fileName.includes("signed") ||
							fileName.includes("seal") ||
							fileName.includes("completed"))
					)
				})

				// If no specific signed file found, look for any non-Original PDF file
				const nonOriginalFile =
					signedFile ??
					files.find(
						file =>
							String(file.type ?? "").toLowerCase() !== "original" &&
							String(file.file_name ?? "").toLowerCase().includes(".pdf")
					)

				if (nonOriginalFile?.url) {
					signedDocumentUrl = nonOriginalFile.url as string
					console.log("✅ Found signed document URL from /my/projects files array:", signedDocumentUrl)

					// Download the document
					let fileResponse = await fetch(signedDocumentUrl)

					// If fetch fails with auth error, try with token
					if (!fileResponse.ok && (fileResponse.status === 401 || fileResponse.status === 403)) {
						fileResponse = await apiCall(async token => {
							return fetch(signedDocumentUrl!, {
								method: "GET",
								headers: {
									Authorization: `Bearer ${token}`,
									Accept: "application/pdf",
								},
							})
						}, userEmail)
					}

					if (fileResponse.ok) {
						const arrayBuffer = await fileResponse.arrayBuffer()
						buffer = Buffer.from(arrayBuffer)
						console.log("✅ Downloaded signed document with seals and certificates")
					}
				}
			} else {
				console.log("🔵 Project is completed - will use download API endpoint for sealed document")
			}
		}
	} catch (error) {
		console.warn("⚠️ Failed to get signed document from /my/projects endpoint:", error)
		// Fall back to existing methods
	}

	// Fallback to existing methods if /my/projects didn't work
	if (!buffer) {
		const projectDetails = await getProjectDetails(projectUuid, userEmail)
		const projectData = projectDetails?.data

		if (!projectData) {
			throw new Error("Project not found or invalid response")
		}

		if (!projectFileName) {
			projectFileName = (projectData.file_name ?? projectData.name ?? null) as string | null
		}

		const signers = (projectData.signers as Signer[]) ?? []
		// Helper function to check if a signer has signed (case-insensitive)
		const isSignerSigned = (s: Signer): boolean => {
			const statusUpper = (s.status ?? "").toUpperCase()
			const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
			const hasSignedAt = s.signed_at !== null && s.signed_at !== undefined && s.signed_at !== ""
			return hasSignedStatus || hasSignedAt
		}
		const signedSigners = signers.filter(isSignerSigned)
		const projectStatusUpper = ((projectData.status as string) ?? "").toUpperCase()
		const isFullySigned =
			signers.length > 0 &&
			signedSigners.length === signers.length &&
			(projectStatusUpper === "COMPLETED" || projectData.completed_at !== null)

		if (!isFullySigned) {
			throw new Error(
				"Document is not fully signed yet. All signers must complete signing before downloading."
			)
		}

		const downloadApiUrl = `${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/download?user_type=ENTERPRISE_API`
		const isCompleted = projectStatusUpper === "COMPLETED" || projectData.completed_at !== null

		// For completed projects, prioritize download API endpoint to ensure we get sealed document
		// Method 1: Download API endpoint (for completed projects - ensures sealed document with seals)
		if (isCompleted && !buffer) {
			try {
				console.log("🔵 Using download API endpoint to get sealed document (project is completed)...")
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
					console.log("✅ Downloaded sealed document with seals and certificates from API endpoint")
				}
			} catch (error) {
				console.warn("⚠️ Download API endpoint failed:", error)
			}
		}

		// Method 2: Vault files (for non-completed or if download API failed)
		if (!buffer) {
			try {
				const rawVaultUuid = (projectData.uuid as string) ?? (projectData.project_uuid as string)
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

		// Method 3: API download endpoint (fallback if not completed or other methods failed)
		if (!buffer && !isCompleted) {
			try {
				console.log("🔵 Using download API endpoint to get signed/sealed document...")
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
					console.log("✅ Downloaded signed/sealed document from API endpoint")
				}
			} catch (error) {
				console.warn("⚠️ API download endpoint failed:", error)
				// API download failed, continue to other methods
			}
		}

	// Method 3: Fallback URLs
	if (!buffer) {
		const fallbackUrl =
			(projectData.signed_url as string) ??
			(projectData.signed_document_url as string) ??
			(projectData.url as string)

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
	}

	if (!buffer) {
		throw new Error("Failed to download signed document: No valid download method succeeded")
	}

	const fileName =
		projectFileName ??
		`signed-document-${projectUuid}.pdf`

	return {
		buffer,
		fileName,
		url: signedDocumentUrl ?? `${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/download?user_type=ENTERPRISE_API`,
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
