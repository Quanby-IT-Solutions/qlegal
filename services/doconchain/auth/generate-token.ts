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
	email: string
	clientKey: string
	clientSecret: string
}): Promise<{ token: string }> {
	const url = new URL("/api/v2/generate/token", env.DOCONCHAIN_API_URL)
	// DocOnChain frequently scopes behavior by user_type.
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const body = new FormData()
	body.set("client_key", input.clientKey)
	body.set("client_secret", input.clientSecret)
	body.set("email", input.email)

	const res = await fetch(url.toString(), {
		method: "POST",
		body,
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain generate token failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	const json = (text ? (JSON.parse(text) as unknown) : null) as
		| null
		| { token?: string }
		| { data?: { token?: string } }
	const token =
		(json && typeof json === "object" && "token" in json ? (json as { token?: string }).token : undefined) ??
		(json && typeof json === "object" && "data" in json ? (json as { data?: { token?: string } }).data?.token : undefined)

	if (!token) {
		throw new Error("DocOnChain generate token response missing token.")
	}

	const expMs = parseJwtExpMs(token)
	cachedTokensByEmail.set(input.email, { token, expiresAtMs: expMs, cachedAtMs: Date.now() })

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
		email,
		clientKey: input.clientKey,
		clientSecret: input.clientSecret,
	})
	return token
}

export async function generateDoconchainToken(input?: {
	email?: string
}): Promise<{ token: string }> {
	const email = (input?.email ?? env.DOCONCHAIN_EMAIL).trim().toLowerCase()
	return await generateDoconchainTokenWithCreds({
		email,
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
		return cached.token
	}

	const existingInFlight = inFlightByEmail.get(email)
	if (existingInFlight) {
		return await existingInFlight
	}

	const promise = (async () => {
		try {
			const { token } = await generateDoconchainToken({ email })
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
				// If the user is already under a sub-org, DocOnChain may require using that sub-org's
				// client_key/client_secret to generate a token.
				try {
					const now = Date.now()

					// Prefer stored sub-org creds from our DB (avoids 401 from list orgs / get details).
					const resolver = input?.getSubOrgCredsForEmail
					if (resolver) {
						const creds = await resolver(email)
						if (creds) {
							cachedEnterpriseCredsByEmail.set(email, {
								subOrgUuid: "",
								clientKey: creds.clientKey,
								clientSecret: creds.clientSecret,
								cachedAtMs: now,
							})
							const { token } = await generateDoconchainTokenWithCreds({
								email,
								clientKey: creds.clientKey,
								clientSecret: creds.clientSecret,
							})
							return token
						}
					}

					const cachedCreds = cachedEnterpriseCredsByEmail.get(email)
					if (cachedCreds && now < cachedCreds.cachedAtMs + CREDS_TTL_MS) {
						const { token } = await generateDoconchainTokenWithCreds({
							email,
							clientKey: cachedCreds.clientKey,
							clientSecret: cachedCreds.clientSecret,
						})
						return token
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

						const details = await getDoconchainSubOrganizationDetails({ subOrganizationUuid: o.uuid })
						if (!details.clientKey || !details.clientSecret) break

						cachedEnterpriseCredsByEmail.set(email, {
							subOrgUuid: o.uuid,
							clientKey: details.clientKey,
							clientSecret: details.clientSecret,
							cachedAtMs: now,
						})
						const { token } = await generateDoconchainTokenWithCreds({
							email,
							clientKey: details.clientKey,
							clientSecret: details.clientSecret,
						})
						return token
					}
				} catch {
					// Ignore and fall back to auto-join logic below.
				}

				const { autoJoinMemberInDoconchainOrganization } = await import(
					"@/services/doconchain/organization/auto-join-member"
				)
				await autoJoinMemberInDoconchainOrganization({ email })
				const { token } = await generateDoconchainToken({ email })
				return token
			}
			throw error
		} finally {
			inFlightByEmail.delete(email)
		}
	})()

	inFlightByEmail.set(email, promise)
	return await promise
}

