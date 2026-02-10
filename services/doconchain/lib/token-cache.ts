import { cache } from "react"

import { env } from "@/env"

import { TOKEN_EXPIRATION_MS, TOKEN_REFRESH_BUFFER_MS } from "./config"

interface CachedToken {
	token: string
	expiresAt: number
	lastVerifiedAt: number
}

const tokenCache = new Map<string, CachedToken>()
// Track verification failures to prevent infinite loops
const verificationFailureCount = new Map<string, number>()
// CRITICAL: Map project UUIDs to the tokens that were used to create them.
// This ensures each project always uses the token it was created with,
// preventing DocoChain session conflicts when multiple projects exist.
// Key: project UUID, Value: { token, storedAt }
interface ProjectTokenEntry {
	token: string
	storedAt: number
}
const projectTokenCache = new Map<string, ProjectTokenEntry>()

// Meeting-scoped token: generated when ENP joins. Used for project creation + Edit Draft links.
// Key: meeting ID, Value: { token, email, storedAt }
interface MeetingTokenEntry {
	token: string
	email: string
	storedAt: number
}
const meetingTokenCache = new Map<string, MeetingTokenEntry>()

// Refresh project/meeting token if it's older than this (2 minutes)
const PROJECT_TOKEN_REFRESH_AGE_MS = 2 * 60 * 1000

function isTokenValid(entry: CachedToken | undefined): entry is CachedToken {
	return !!entry && Date.now() < entry.expiresAt - TOKEN_REFRESH_BUFFER_MS
}

const MAX_VERIFICATION_FAILURES = 3 // Stop verifying after 3 consecutive failures

export async function generateToken(email?: string, forceRefresh = false): Promise<string> {
	const cacheKey = email ?? env.DOCONCHAIN_EMAIL
	const cached = tokenCache.get(cacheKey)

	if (!forceRefresh && isTokenValid(cached)) {
		return cached.token
	}

	const formData = new FormData()
	formData.append("client_key", env.DOCONCHAIN_CLIENT_KEY)
	formData.append("client_secret", env.DOCONCHAIN_CLIENT_SECRET)
	const emailToUse = email ?? env.DOCONCHAIN_EMAIL
	formData.append("email", emailToUse)

	const response = await fetch(`${env.DOCONCHAIN_API_URL}/api/v2/generate/token`, {
		method: "POST",
		body: formData,
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`doconchain token generation failed: ${response.status} - ${errorText}`)
	}

	const data = (await response.json()) as { token?: string; data?: { token?: string } }
	// Handle both response formats: { token: "..." } or { data: { token: "..." } }
	const token = data.token ?? data.data?.token

	if (!token) {
		console.error("doconchain token response:", JSON.stringify(data, null, 2))
		throw new Error("doconchain response missing token")
	}

	tokenCache.set(cacheKey, {
		token,
		expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
		lastVerifiedAt: Date.now(),
	})

	// Reset verification failure count when we generate a new token
	verificationFailureCount.delete(cacheKey)

	return token
}

export async function getToken(email?: string, forceVerify = false): Promise<string> {
	const cacheKey = email ?? env.DOCONCHAIN_EMAIL
	const cached = tokenCache.get(cacheKey)

	// If we have a cached token, verify it before using
	if (cached) {
		const failureCount = verificationFailureCount.get(cacheKey) ?? 0

		// Skip verification if we've had too many consecutive failures
		// This prevents infinite loops when verification endpoint is having issues
		if (failureCount < MAX_VERIFICATION_FAILURES) {
			try {
				const verify = await verifyAuthToken({
					token: cached.token,
					orgInviteCode: env.DOCONCHAIN_ORG_INVITE_CODE,
				})

				const status = String(verify?.data?.status ?? "")
					.toLowerCase()
					.trim()
				// Token is valid unless status is explicitly inactive
				// API may return "active", "valid", or other positive values
				const isInvalid = status === "inactive" || status === "expired" || status === ""
				if (!isInvalid) {
					// Token is valid - reset failure count and update timestamp
					verificationFailureCount.delete(cacheKey)
					tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
					return cached.token
				}

				// Status indicates invalid - regenerate token
				console.log(
					`⚠️ Token verification failed (status: ${status || "(empty)"}) - token is invalid, regenerating...`
				)
				verificationFailureCount.delete(cacheKey) // Reset count since we're regenerating
				// Invalidate and regenerate
				tokenCache.delete(cacheKey)
				return generateToken(email, true)
			} catch {
				// Verification endpoint itself failed (network error, etc.)
				// If forceVerify is true, regenerate to be safe
				// Otherwise, return cached token (might still be valid)
				if (forceVerify) {
					console.warn(
						`⚠️ Token verification endpoint failed - regenerating token due to forceVerify=true`
					)
					verificationFailureCount.delete(cacheKey)
					tokenCache.delete(cacheKey)
					return generateToken(email, true)
				}
				// Increment failure count but don't regenerate token - it might still be valid
				verificationFailureCount.set(cacheKey, failureCount + 1)
				// Update timestamp to avoid spamming verification
				tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
				return cached.token
			}
		} else {
			// Too many verification failures - regenerate token to be safe
			console.warn(`⚠️ Too many verification failures (${failureCount}) - regenerating token...`)
			verificationFailureCount.delete(cacheKey)
			tokenCache.delete(cacheKey)
			return generateToken(email, true)
		}
	}

	// No cached token - generate a new one
	return generateToken(email, true)
}

export const getCachedToken = cache(async (email?: string): Promise<string> => {
	return getToken(email)
})

export function invalidateToken(email?: string): void {
	const cacheKey = email ?? env.DOCONCHAIN_EMAIL
	tokenCache.delete(cacheKey)
	// Also clear verification failure count when invalidating
	verificationFailureCount.delete(cacheKey)
}

/**
 * Store the token that was used to create a project.
 * This ensures we can always use the same token for that project's operations.
 */
export function setProjectToken(projectUuid: string, token: string): void {
	projectTokenCache.set(projectUuid, {
		token,
		storedAt: Date.now(),
	})
	console.log(`🔵 Stored token for project ${projectUuid.substring(0, 8)}...`)
}

/**
 * Get the token that was used to create a project.
 * Returns undefined if no token was stored for this project.
 */
export function getProjectToken(projectUuid: string): string | undefined {
	const entry = projectTokenCache.get(projectUuid)
	return entry?.token
}

/**
 * Refresh the project token if it's older than PROJECT_TOKEN_REFRESH_AGE_MS.
 * Returns the (possibly refreshed) token for the project.
 */
export async function getOrRefreshProjectToken(
	projectUuid: string,
	email?: string
): Promise<string | undefined> {
	const entry = projectTokenCache.get(projectUuid)
	if (!entry) {
		return undefined
	}

	const ageMs = Date.now() - entry.storedAt
	if (ageMs > PROJECT_TOKEN_REFRESH_AGE_MS) {
		console.log(`🔄 Project token is ${Math.round(ageMs / 1000 / 60)} minutes old - refreshing...`)
		// Generate a fresh token and update the project token cache
		const freshToken = await generateToken(email, true)
		setProjectToken(projectUuid, freshToken)
		return freshToken
	}

	return entry.token
}

/**
 * Clear the stored token for a project (e.g., when project is deleted).
 */
export function clearProjectToken(projectUuid: string): void {
	projectTokenCache.delete(projectUuid)
}

/**
 * Store the DocoChain token for a meeting (generated when ENP joins).
 * Used for project creation and Edit Draft link generation so the link is always correct.
 */
function redactEmail(email: string): string {
	const at = email.indexOf("@")
	if (at <= 0) return "***"
	const local = email.slice(0, at)
	const domain = email.slice(at + 1)
	const show = local.length <= 2 ? "**" : `${local.slice(0, 2)}***`
	return `${show}@${domain}`
}

export function setMeetingToken(meetingId: string, email: string, token: string): void {
	meetingTokenCache.set(meetingId, {
		token,
		email,
		storedAt: Date.now(),
	})
	console.log(
		`🔵 Stored meeting-scoped DocoChain token for meeting ${meetingId.substring(0, 8)}... (ENP: ${redactEmail(email)})`
	)
}

/**
 * Get the meeting-scoped DocoChain token, if any.
 */
export function getMeetingToken(meetingId: string): { token: string; email: string } | undefined {
	const entry = meetingTokenCache.get(meetingId)
	return entry ? { token: entry.token, email: entry.email } : undefined
}

/**
 * Get or refresh the meeting-scoped token. Returns undefined if none stored.
 */
export async function getOrRefreshMeetingToken(
	meetingId: string,
	email: string
): Promise<string | undefined> {
	const entry = meetingTokenCache.get(meetingId)
	if (!entry) return undefined

	const ageMs = Date.now() - entry.storedAt
	if (ageMs > PROJECT_TOKEN_REFRESH_AGE_MS) {
		console.log(`🔄 Meeting token is ${Math.round(ageMs / 1000 / 60)} minutes old - refreshing...`)
		const freshToken = await generateToken(email, true)
		setMeetingToken(meetingId, email, freshToken)
		return freshToken
	}
	return entry.token
}

/**
 * Ensure a meeting has a valid DocoChain token for the given ENP email.
 * Call when ENP joins the meeting. Returns the token (existing or newly generated).
 */
export async function ensureMeetingToken(meetingId: string, email: string): Promise<string> {
	// If we already have a meeting token but it belongs to a different ENP email,
	// do NOT reuse it (prevents cross-user session conflicts).
	const current = meetingTokenCache.get(meetingId)
	if (current && current.email !== email) {
		console.warn(
			`⚠️ Meeting token email mismatch for meeting ${meetingId.substring(0, 8)}... (stored for ${redactEmail(current.email)}, requested ${redactEmail(email)}). Regenerating...`
		)
		const token = await generateToken(email, true)
		setMeetingToken(meetingId, email, token)
		return token
	}

	const existing = await getOrRefreshMeetingToken(meetingId, email)
	if (existing) return existing

	const token = await generateToken(email, true)
	setMeetingToken(meetingId, email, token)
	return token
}

/**
 * Always call the DocoChain generate-token API and store the result as the meeting token.
 * Use when ENP enters the room (e.g. getToken) so we explicitly hit the API at that moment.
 * Does not reuse cached meeting token.
 */
export async function generateAndSetMeetingToken(
	meetingId: string,
	email: string
): Promise<string> {
	const token = await generateToken(email, true)
	setMeetingToken(meetingId, email, token)
	return token
}

interface VerifyTokenParams {
	token: string
	orgInviteCode: string
}

export async function verifyAuthToken({ token, orgInviteCode }: VerifyTokenParams): Promise<{
	message: string
	data: {
		redirect_to: string
		status: string
	}
}> {
	const response = await fetch(
		`${env.DOCONCHAIN_API_URL}/api/v2/auth/verify?user_type=ENTERPRISE_API`,
		{
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
				"Accept": "application/json",
			},
			body: JSON.stringify({
				org_invite_code: orgInviteCode,
			}),
		}
	)

	if (!response.ok) {
		// Don't throw - return a result indicating failure instead
		// This prevents infinite loops when verification itself fails
		return {
			message: "Token verification failed",
			data: {
				redirect_to: "",
				status: "inactive",
			},
		}
	}

	const data = (await response.json()) as {
		message: string
		data: {
			redirect_to: string
			status: string
		}
	}

	return data
}
