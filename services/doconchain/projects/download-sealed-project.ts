import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
	type GetSubOrgCredsForEmail,
} from "@/services/doconchain/auth/generate-token"
import { getDoconchainMyProjectDetails } from "@/services/doconchain/projects/get-my-project-details"
import { getDoconchainVaultItem } from "@/services/doconchain/vault/get-vault-item"
import { getDoconchainVaultItems } from "@/services/doconchain/vault/get-vault-items"

import { env } from "@/env"

async function fetchProjectDownload(params: { projectUuid: string; token: string }): Promise<{
	contentType: string | null
	filename: string | null
	buffer: Buffer
}> {
	const url = new URL(`/api/v2/projects/${params.projectUuid}/download`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const res = await fetch(url.toString(), {
		method: "GET",
		headers: {
			accept: "application/pdf,application/json",
			authorization: `Bearer ${params.token}`,
		},
	})

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		const err = new Error(
			`DocOnChain download sealed project failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	const contentType = res.headers.get("content-type")
	const disposition = res.headers.get("content-disposition")
	const filename =
		typeof disposition === "string"
			? (/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i.exec(disposition)?.[2] ?? null)
			: null

	const arrayBuffer = await res.arrayBuffer()
	return { contentType, filename, buffer: Buffer.from(arrayBuffer) }
}

async function fetchFromVaultFileUrl(params: {
	projectUuid: string
	token: string
	email: string
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<{ contentType: string | null; filename: string | null; buffer: Buffer }> {
	let vaultUuidToFetch = params.projectUuid
	let vault: Awaited<ReturnType<typeof getDoconchainVaultItem>> | Error
	try {
		vault = await getDoconchainVaultItem({
			email: params.email,
			uuid: vaultUuidToFetch,
			getSubOrgCredsForEmail: params.getSubOrgCredsForEmail,
		})
	} catch (err) {
		vault = err instanceof Error ? err : new Error("Failed to fetch DocOnChain vault item.")
	}

	// Some environments require using the vault item's own `uuid`, not the `project_uuid`.
	// If direct lookup fails, search the vault list for a matching `project_uuid`.
	if (vault instanceof Error) {
		const msg = vault.message.toLowerCase()
		const looksLikeNotFound = msg.includes("no item found") || msg.includes("not found")
		const status = (vault as Error & { status?: number }).status
		if (looksLikeNotFound || status === 400 || status === 404) {
			let foundVaultUuid: string | null = null
			const perPage = 50
			for (let page = 1; page <= 10; page += 1) {
				const list = await getDoconchainVaultItems({
					email: params.email,
					perPage,
					page,
					userItemsOnly: "no",
					apiIntegratedProjectsOnly: "no",
					getSubOrgCredsForEmail: params.getSubOrgCredsForEmail,
				}).catch(() => null)
				const items = list?.items ?? []
				const match = items.find(
					it =>
						typeof it?.project_uuid === "string" &&
						it.project_uuid.trim() === params.projectUuid &&
						typeof it?.uuid === "string" &&
						it.uuid.trim().length > 0
				)
				if (match?.uuid) {
					foundVaultUuid = match.uuid.trim()
					break
				}
				// Stop early if we're past last_page (when available)
				const last = typeof list?.meta?.last_page === "number" ? list.meta.last_page : null
				if (last !== null && page >= last) break
				if (items.length === 0) break
			}

			if (foundVaultUuid) {
				vaultUuidToFetch = foundVaultUuid
				vault = await getDoconchainVaultItem({
					email: params.email,
					uuid: vaultUuidToFetch,
					getSubOrgCredsForEmail: params.getSubOrgCredsForEmail,
				})
			} else {
				const e = new Error("DocOnChain vault item not found yet.")
				;(e as Error & { status?: number }).status = 425
				throw e
			}
		} else {
			throw vault
		}
	}

	// At this point `vault` is the successful response.
	const vaultRes = vault
	if (!vaultRes.isCompleted) {
		const err = new Error("DocOnChain vault item is not completed yet.")
		;(err as Error & { status?: number }).status = 425
		throw err
	}
	const filesWithUrl = (vaultRes.item?.files ?? []).filter(
		(f): f is { file_name?: string; file_url: string } =>
			typeof f?.file_url === "string" && f.file_url.trim().length > 0
	)
	// Prefer the file that looks like the sealed/completed notarized document (has seal applied).
	const sealedLike = /completed|sealed|final|notarized|signed.*completed/i
	const preferred = filesWithUrl.find(f => sealedLike.test(String(f.file_name ?? "")))
	const chosen = preferred ?? filesWithUrl[0]
	const urlString =
		chosen?.file_url?.trim() ??
		(typeof (vaultRes.item as unknown as { url?: unknown } | null)?.url === "string"
			? String((vaultRes.item as unknown as { url?: unknown } | null)?.url)
			: null)

	if (!urlString?.trim()) {
		throw new Error("DocOnChain vault item missing file_url.")
	}

	// If vault provides a pre-signed URL (common for S3), do NOT attach Authorization headers.
	// S3 will reject requests that include both signed query params and an Authorization header.
	const isPresignedUrl = (() => {
		try {
			const u = new URL(urlString)
			const keys = u.searchParams
			return (
				keys.has("X-Amz-Algorithm") ||
				keys.has("X-Amz-Signature") ||
				keys.has("X-Amz-Credential") ||
				keys.has("X-Amz-Date") ||
				keys.has("Signature") ||
				/X-Amz-/i.test(u.search)
			)
		} catch {
			return /X-Amz-/i.test(urlString)
		}
	})()

	const headers: Record<string, string> = {
		accept: "application/pdf,application/octet-stream,*/*",
	}
	if (!isPresignedUrl) {
		// Some DocOnChain file URLs may still require the same bearer token.
		headers.authorization = `Bearer ${params.token}`
	}

	const res = await fetch(urlString, {
		method: "GET",
		headers,
	})

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		throw new Error(
			`DocOnChain vault file download failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	const contentType = res.headers.get("content-type")
	const disposition = res.headers.get("content-disposition")
	const filename =
		typeof disposition === "string"
			? (/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i.exec(disposition)?.[2] ?? null)
			: null
	const arrayBuffer = await res.arrayBuffer()
	return { contentType, filename, buffer: Buffer.from(arrayBuffer) }
}

export async function downloadDoconchainSealedProject(input: {
	projectUuid: string
	email: string
	/** Optional: resolve sub-org enterprise creds for this token email (usually the ENP owner). */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<{ buffer: Buffer; contentType: string; filename: string | null }> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("Email is required to download sealed project.")

	const doRequest = async () => {
		// Prefer explicit user-token (DOCONCHAIN_API_TOKEN) if configured; otherwise generate.
		const token = await getDoconchainApiToken({
			email,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		try {
			return await fetchProjectDownload({ projectUuid, token })
		} catch (error) {
			const status =
				error instanceof Error ? (error as Error & { status?: number }).status : undefined
			// If download route doesn't exist (E_ROUTE_NOT_FOUND), fall back to Vault file_url.
			if (status === 404) {
				// Fallback 1: try /my/projects/:uuid to find completed/sealed file URLs
				try {
					const details = await getDoconchainMyProjectDetails({
						projectUuid,
						email,
						getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
					})
					const data = details?.data
					const files = (data?.files ?? []) as Array<{
						file_name?: string | null
						type?: string | null
						url?: string | null
						file_url?: string | null
					}>

					const projectStatus = String(data?.status ?? "").toLowerCase()
					const isCompleted = projectStatus === "completed" || (data?.completed_at ?? null) !== null

					if (isCompleted && files.length > 0) {
						// Prefer “completed” files (these typically include the seal)
						const completedFile = files.find(f => {
							const type = String(f.type ?? "")
								.toLowerCase()
								.trim()
							const fileName = String(f.file_name ?? "").toLowerCase()
							return (
								type.includes("completed") ||
								fileName.includes("documentcompleted") ||
								fileName.includes("completed")
							)
						})
						const chosen = completedFile ?? files[0]
						const fileUrlRaw =
							typeof chosen?.file_url === "string"
								? chosen.file_url
								: typeof chosen?.url === "string"
									? chosen.url
									: null
						const fileUrl = fileUrlRaw?.trim() ? fileUrlRaw.trim() : null
						if (fileUrl) {
							// Download from that URL (respecting presigned-vs-bearer logic)
							const isPresignedUrl = (() => {
								try {
									const u = new URL(fileUrl)
									return /X-Amz-/i.test(u.search) || u.searchParams.has("X-Amz-Algorithm")
								} catch {
									return /X-Amz-/i.test(fileUrl)
								}
							})()
							const headers: Record<string, string> = {
								accept: "application/pdf,application/octet-stream,*/*",
							}
							if (!isPresignedUrl) headers.authorization = `Bearer ${token}`

							const resp = await fetch(fileUrl, { method: "GET", headers })
							if (!resp.ok) {
								const text = await resp.text().catch(() => "")
								throw new Error(
									`DocOnChain my/projects file download failed (${resp.status} ${resp.statusText})${text ? `: ${text}` : ""}`
								)
							}
							const contentType = resp.headers.get("content-type")
							const disposition = resp.headers.get("content-disposition")
							const filename =
								typeof disposition === "string"
									? (/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i.exec(disposition)?.[2] ?? null)
									: null
							const arrayBuffer = await resp.arrayBuffer()
							return { contentType, filename, buffer: Buffer.from(arrayBuffer) }
						}
					}
				} catch {
					// ignore and continue to vault fallback
				}

				// Fallback 2: vault list+item resolution
				return fetchFromVaultFileUrl({
					projectUuid,
					token,
					email,
					getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
				})
			}
			throw error
		}
	}

	try {
		const res = await doRequest()
		return {
			buffer: res.buffer,
			contentType: res.contentType ?? "application/pdf",
			filename: res.filename,
		}
	} catch (error) {
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			const invalidate = invalidateDoconchainToken as (email: string) => void
			invalidate(email)
			const res = await doRequest()
			return {
				buffer: res.buffer,
				contentType: res.contentType ?? "application/pdf",
				filename: res.filename,
			}
		}
		throw error
	}
}
