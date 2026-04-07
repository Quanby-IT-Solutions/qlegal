import { env } from "@/env"
import { getDoconchainSubOrganizationDetails } from "@/services/doconchain/organization/get-sub-organization"
import { listDoconchainOrganizations } from "@/services/doconchain/organization/list-organizations"

type CachedToken = { token: string; expiresAtMs?: number; cachedAtMs: number }

const cachedTokensByEmail = new Map<string, CachedToken>()
const inFlightByEmail = new Map<string, Promise<string>>()

const FALLBACK_TTL_MS = 5 * 60 * 1000
const EXPIRY_SAFETY_WINDOW_MS = 60_000

type CachedEnterpriseCreds = {
	clientKey: string
	clientSecret: string
	subOrgUuid: string
	cachedAtMs: number
}
const cachedEnterpriseCredsByEmail = new Map<string, CachedEnterpriseCreds>()
const CREDS_TTL_MS = 15 * 60 * 1000

const debugLogsEnabled = env.NODE_ENV !== "production"
const DOCONCHAIN_FETCH_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController()
	const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeoutMs)
	try {
		return await fetch(url, { ...init, signal: controller.signal })
	} finally {
		clearTimeout(timeoutId)
	}
}

function parseJwtExpMs(token: string): number | undefined {
	const parts = token.split(".")
	if (parts.length < 2) {
		return undefined
	}

	try {
		const payload = Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
			"utf8"
		)
		const json = JSON.parse(payload) as { exp?: number }
		if (typeof json.exp !== "number") {
			return undefined
		}
		return json.exp * 1000
	} catch {
		return undefined
	}
}

async function generateDoconchainTokenWithCreds(input: {
	/**
	 * Cache key for this token. We still cache per "requested email" even when the DocOnChain
	 * token endpoint does not require `email` in the payload for main-org credentials.
	 */
	cacheKeyEmail: string
	/**
	 * Optional email to include in the token payload.
	 * DocOnChain requirement (per DocOnChain devs):
	 * - main-org client_key/secret: DO NOT include email
	 * - sub-org client_key/secret: include member/admin email
	 */
	payloadEmail?: string | null
	clientKey: string
	clientSecret: string
}): Promise<{ token: string }> {
	const payloadEmail = (input.payloadEmail ?? "").trim()
	const baseUrl = new URL("/api/v2/generate/token", env.DOCONCHAIN_API_URL)

	const body = new FormData()
	body.set("client_key", input.clientKey)
	body.set("client_secret", input.clientSecret)
	if (payloadEmail) body.set("email", payloadEmail)

	const queryUrl = new URL(baseUrl.toString())
	queryUrl.searchParams.set("client_key", input.clientKey)
	queryUrl.searchParams.set("client_secret", input.clientSecret)
	if (payloadEmail) queryUrl.searchParams.set("email", payloadEmail)

	const startMs = Date.now()
	if (debugLogsEnabled) {
		console.log("[doconchain][token] generate start", {
			cacheKeyEmail: input.cacheKeyEmail,
			payloadEmail: payloadEmail ? "***" : null,
			url: baseUrl.toString(),
		})
	}

	const tryRequest = async (variant: "multipart" | "query"): Promise<{ text: string }> => {
		const url = variant === "multipart" ? baseUrl.toString() : queryUrl.toString()
		if (debugLogsEnabled) {
			console.log("[doconchain][token] generate request", {
				cacheKeyEmail: input.cacheKeyEmail,
				variant,
				url,
				hasPayloadEmail: Boolean(payloadEmail),
			})
		}

		let res: Response
		try {
			res = await fetchWithTimeout(
				url,
				variant === "multipart"
					? {
							method: "POST",
							headers: { accept: "application/json" },
							body,
						}
					: {
							method: "POST",
							headers: { accept: "application/json" },
						},
				DOCONCHAIN_FETCH_TIMEOUT_MS
			)
		} catch (error) {
			const isAbort = error instanceof Error && error.name === "AbortError"
			const msg = isAbort
				? `DocOnChain generate token timed out after ${DOCONCHAIN_FETCH_TIMEOUT_MS}ms`
				: error instanceof Error
					? error.message
					: String(error)
			if (debugLogsEnabled) {
				console.log("[doconchain][token] generate error", {
					cacheKeyEmail: input.cacheKeyEmail,
					variant,
					message: msg,
					totalMs: Date.now() - startMs,
				})
			}
			throw new Error(msg)
		}

		const text = await res.text().catch(() => "")
		if (!res.ok) {
			if (debugLogsEnabled) {
				console.log("[doconchain][token] generate non-200", {
					cacheKeyEmail: input.cacheKeyEmail,
					variant,
					status: res.status,
					statusText: res.statusText,
					totalMs: Date.now() - startMs,
					bodyPreview: text.slice(0, 300),
				})
			}
			const err = new Error(
				`DocOnChain generate token failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
			)
			;(err as Error & { status?: number }).status = res.status
			throw err
		}
		return { text }
	}

	let text: string
	try {
		// Primary attempt: multipart (matches their older docs/curl examples)
		;({ text } = await tryRequest("multipart"))
	} catch (e) {
		const msg = e instanceof Error ? e.message.toLowerCase() : ""
		const status = e instanceof Error ? (e as Error & { status?: number }).status : undefined
		const looksLikeFormatMismatch =
			status === 400 ||
			status === 415 ||
			msg.includes("must provide the email parameter") ||
			msg.includes("belongs to an organization")

		// Fallback attempt: querystring POST (matches DocOnChain dev guidance)
		if (looksLikeFormatMismatch) {
			;({ text } = await tryRequest("query"))
		} else {
			throw e
		}
	}

	const json = (text ? (JSON.parse(text) as unknown) : null) as
		| null
		| { token?: string }
		| { data?: { token?: string } }
	const token =
		(json && typeof json === "object" && "token" in json ? (json as { token?: string }).token : undefined) ??
		(json && typeof json === "object" && "data" in json ? (json as { data?: { token?: string } }).data?.token : undefined)

	if (!token) {
		if (debugLogsEnabled) {
			console.log("[doconchain][token] generate missing token", {
				cacheKeyEmail: input.cacheKeyEmail,
				totalMs: Date.now() - startMs,
			})
		}
		throw new Error("DocOnChain generate token response missing token.")
	}

	const expMs = parseJwtExpMs(token)
	const cacheKey = input.cacheKeyEmail.trim().toLowerCase()
	cachedTokensByEmail.set(cacheKey, { token, expiresAtMs: expMs, cachedAtMs: Date.now() })
	if (debugLogsEnabled) {
		console.log("[doconchain][token] generate ok", {
			cacheKeyEmail: input.cacheKeyEmail,
			hasExp: typeof expMs === "number",
			totalMs: Date.now() - startMs,
		})
	}

	return { token }
}

/**
 * Generate a DocOnChain token using explicit (org/sub-org) enterprise credentials.
 * Use when DocOnChain scopes users by sub-organization credentials.
 */
export async function getDoconchainApiTokenWithEnterpriseCreds(input: {
	email: string
	clientKey: string
	clientSecret: string
}): Promise<string> {
	const email = input.email.trim().toLowerCase()
	if (!email) throw new Error("DocOnChain token generation requires a non-empty email.")
	const { token } = await generateDoconchainTokenWithCreds({
		cacheKeyEmail: email,
		payloadEmail: email,
		clientKey: input.clientKey,
		clientSecret: input.clientSecret,
	})
	return token
}

export async function generateDoconchainToken(input?: {
	email?: string
}): Promise<{ token: string }> {
	// DocOnChain environments vary. Some require `email` even for main-org credentials.
	// We always include it here to satisfy those environments (and because our caching is per-email).
	const email = (input?.email ?? env.DOCONCHAIN_EMAIL).trim().toLowerCase()
	if (!email) throw new Error("DocOnChain token generation requires a non-empty email.")
	return await generateDoconchainTokenWithCreds({
		cacheKeyEmail: email,
		payloadEmail: email,
		clientKey: env.DOCONCHAIN_CLIENT_KEY,
		clientSecret: env.DOCONCHAIN_CLIENT_SECRET,   
	})
}

function isCachedTokenUsable(cached: CachedToken, nowMs: number): boolean {
	if (cached.expiresAtMs) {
		return nowMs < cached.expiresAtMs - EXPIRY_SAFETY_WINDOW_MS
	}
	return nowMs < cached.cachedAtMs + FALLBACK_TTL_MS
}

export function invalidateDoconchainToken(email: string): void {
	const key = email.trim().toLowerCase()
	cachedTokensByEmail.delete(key)
}

/** Optional resolver to find sub-org credentials for an email (e.g. from DB). Used when "User not found" to try sub-org scoped token before auto-join. */
export type GetSubOrgCredsForEmail = (
	email: string
) => Promise<{ clientKey: string; clientSecret: string } | null>

export async function getDoconchainApiToken(input?: {
	email?: string
	forceGenerated?: boolean
	/** When provided and token generation fails with "User not found", try this to get sub-org creds and generate token with them. */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<string> {
	const explicit = env.DOCONCHAIN_API_TOKEN ?? env.DOCONCHAIN_USER_TOKEN
	if (explicit && !input?.forceGenerated) {
		return explicit
	}

	const email = (input?.email ?? env.DOCONCHAIN_EMAIL).trim().toLowerCase()
	if (!email) {
		throw new Error("DocOnChain token generation requires a non-empty email.")
	}

	const now = Date.now()
	const cached = cachedTokensByEmail.get(email)
	if (cached?.token && isCachedTokenUsable(cached, now)) {
		if (debugLogsEnabled) {
			console.log("[doconchain][token] cache hit", { email })
		}
		return cached.token
	}

	const existingInFlight = inFlightByEmail.get(email)
	if (existingInFlight) {
		if (debugLogsEnabled) {
			console.log("[doconchain][token] in-flight await", { email })
		}
		return await existingInFlight
	}

	const promise = (async () => {
		const startMs = Date.now()
		try {
			if (debugLogsEnabled) {
				console.log("[doconchain][token] getDoconchainApiToken start", {
					email,
					forceGenerated: Boolean(input?.forceGenerated),
				})
			}
			const { token } = await generateDoconchainToken({ email })
			if (debugLogsEnabled) {
				console.log("[doconchain][token] primary generate ok", {
					email,
					totalMs: Date.now() - startMs,
				})
			}
			return token
		} catch (error) {
			// User may not exist in parent org or is in a sub-org. Try sub-org creds first, then auto-join.
			// DocOnChain can return: 401 "E_UNAUTHORIZED_ACCESS" (user in sub-org), 400 "User not found", or "check the email parameter".
			const msg = error instanceof Error ? error.message.toLowerCase() : ""
			const looksLikeMissingUserOrUnauthorized =
				msg.includes("kindly check the email parameter") ||
				msg.includes("check the email parameter") ||
				msg.includes("user not found") ||
				msg.includes("e_unauthorized_access") ||
				(msg.includes("401") && msg.includes("unauthorized"))
			if (looksLikeMissingUserOrUnauthorized) {
				// Avoid deadlocks: the fallback sub-org discovery can call APIs that themselves need
				// a token generated for DOCONCHAIN_EMAIL, which would re-enter this function and
				// await the same in-flight promise.
				const normalizedEnvEmail = env.DOCONCHAIN_EMAIL.trim().toLowerCase()
				if (email === normalizedEnvEmail) {
					throw error
				}

				if (debugLogsEnabled) {
					console.log("[doconchain][token] missing/unauthorized; fallback path", {
						email,
						message: error instanceof Error ? error.message : String(error),
						totalMs: Date.now() - startMs,
					})
				}
				// If the user is already under a sub-org, DocOnChain may require using that sub-org's
				// client_key/client_secret to generate a token.
				try {
					const now = Date.now()

					// Prefer stored sub-org creds from our DB (avoids 401 from list orgs / get details).
					const resolver = input?.getSubOrgCredsForEmail
					if (resolver) {
						if (debugLogsEnabled) {
							console.log("[doconchain][token] trying DB sub-org creds resolver", { email })
						}
						const creds = await resolver(email)
						if (creds) {
							if (debugLogsEnabled) {
								console.log("[doconchain][token] resolver returned creds", { email })
							}
							cachedEnterpriseCredsByEmail.set(email, {
								subOrgUuid: "",
								clientKey: creds.clientKey,
								clientSecret: creds.clientSecret,
								cachedAtMs: now,
							})
							const { token } = await generateDoconchainTokenWithCreds({
								cacheKeyEmail: email,
								payloadEmail: email,
								clientKey: creds.clientKey,
								clientSecret: creds.clientSecret,
							})
							if (debugLogsEnabled) {
								console.log("[doconchain][token] token via resolver creds ok", {
									email,
									totalMs: Date.now() - startMs,
								})
							}
							return token
						}
					}

					const cachedCreds = cachedEnterpriseCredsByEmail.get(email)
					if (cachedCreds && now < cachedCreds.cachedAtMs + CREDS_TTL_MS) {
						if (debugLogsEnabled) {
							console.log("[doconchain][token] using cached enterprise creds", { email })
						}
						const { token } = await generateDoconchainTokenWithCreds({
							cacheKeyEmail: email,
							payloadEmail: email,
							clientKey: cachedCreds.clientKey,
							clientSecret: cachedCreds.clientSecret,
						})
						if (debugLogsEnabled) {
							console.log("[doconchain][token] token via cached enterprise creds ok", {
								email,
								totalMs: Date.now() - startMs,
							})
						}
						return token
					}

					if (debugLogsEnabled) {
						console.log("[doconchain][token] listing orgs for sub-org lookup", { email })
					}
					const orgs = await listDoconchainOrganizations()
					const subOrgs = orgs
						.map(o => ({ uuid: String(o.uuid ?? "").trim(), parentId: o.parent_id }))
						.filter(o => o.uuid)
						// likely sub-orgs only
						.filter(o => o.parentId !== null && o.parentId !== undefined)

					for (const o of subOrgs) {
						const { getDoconchainSubOrgMembers } = await import(
							"@/services/doconchain/organization/get-sub-org-members"
						)
						const members = await getDoconchainSubOrgMembers({ subOrganizationUuid: o.uuid })
						const found = members.some(m => (m.email ?? "").trim().toLowerCase() === email)
						if (!found) continue

						if (debugLogsEnabled) {
							console.log("[doconchain][token] found member in sub-org", {
								email,
								subOrgUuid: o.uuid,
							})
						}
						const details = await getDoconchainSubOrganizationDetails({ subOrganizationUuid: o.uuid })
						if (!details.clientKey || !details.clientSecret) break

						cachedEnterpriseCredsByEmail.set(email, {
							subOrgUuid: o.uuid,
							clientKey: details.clientKey,
							clientSecret: details.clientSecret,
							cachedAtMs: now,
						})
						const { token } = await generateDoconchainTokenWithCreds({
							cacheKeyEmail: email,
							payloadEmail: email,
							clientKey: details.clientKey,
							clientSecret: details.clientSecret,
						})
						if (debugLogsEnabled) {
							console.log("[doconchain][token] token via sub-org details ok", {
								email,
								subOrgUuid: o.uuid,
								totalMs: Date.now() - startMs,
							})
						}
						return token
					}
				} catch {
					// Ignore and fall back to auto-join logic below.
				}

				if (debugLogsEnabled) {
					console.log("[doconchain][token] auto-join fallback", { email })
				}
				const { autoJoinMemberInDoconchainOrganization } = await import(
					"@/services/doconchain/organization/auto-join-member"
				)
				try {
					await autoJoinMemberInDoconchainOrganization({ email })
				} catch (e) {
					// DocOnChain sometimes returns 400 for "already exists in your or another organization".
					// Treat that as idempotent and continue to token generation.
					if (!looksLikeDoconchainAlreadyMemberError(e)) {
						throw e
					}
				}
				const { token } = await generateDoconchainToken({ email })
				if (debugLogsEnabled) {
					console.log("[doconchain][token] token after auto-join ok", {
						email,
						totalMs: Date.now() - startMs,
					})
				}
				return token
			}
			if (debugLogsEnabled) {
				console.log("[doconchain][token] non-fallback error", {
					email,
					message: error instanceof Error ? error.message : String(error),
					totalMs: Date.now() - startMs,
				})
			}
			throw error
		} finally {
			inFlightByEmail.delete(email)
		}
	})()

	inFlightByEmail.set(email, promise)
	return await promise
}

function looksLikeDoconchainAlreadyMemberError(error: unknown): boolean {
	const msg = error instanceof Error ? error.message.toLowerCase() : ""
	return (
		msg.includes("auto-join failed") &&
		(msg.includes("(400") || msg.includes(" 400 ")) &&
		(msg.includes("already exist") ||
			msg.includes("already exists") ||
			msg.includes("cannot add an email") ||
			msg.includes("email that already"))
	)
}

