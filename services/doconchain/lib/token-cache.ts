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

function isTokenValid(entry: CachedToken | undefined): entry is CachedToken {
	return !!entry && Date.now() < entry.expiresAt - TOKEN_REFRESH_BUFFER_MS
}

const TOKEN_VERIFY_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
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

	if (cached && isTokenValid(cached)) {
		// Proactively verify token validity with DocoChain periodically
		// so we can refresh before it causes downstream failures.
		// Only verify periodically, not on every call, to avoid performance issues
		const timeSinceLastVerify = Date.now() - cached.lastVerifiedAt
		const timeUntilExpiration = cached.expiresAt - Date.now()
		const shouldVerifyPeriodically = timeSinceLastVerify > TOKEN_VERIFY_INTERVAL_MS
		// Also verify if token is close to expiration (within 15 minutes)
		const shouldVerifyNearExpiration = timeUntilExpiration < 15 * 60 * 1000 && timeSinceLastVerify > 2 * 60 * 1000 // At least 2 min since last verify
		const shouldVerify = shouldVerifyPeriodically || shouldVerifyNearExpiration || forceVerify
		const failureCount = verificationFailureCount.get(cacheKey) ?? 0

		// Skip verification if we've had too many consecutive failures
		// This prevents infinite loops when verification endpoint is having issues
		if (shouldVerify && failureCount < MAX_VERIFICATION_FAILURES) {
			try {
				const verify = await verifyAuthToken({
					token: cached.token,
					orgInviteCode: env.DOCONCHAIN_ORG_INVITE_CODE,
				})

				const status = String(verify?.data?.status ?? "").toLowerCase()
				if (status === "active") {
					// Token is valid - reset failure count and update timestamp
					verificationFailureCount.delete(cacheKey)
					tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
					return cached.token
				}

				// Status is not active - token is likely expired or invalid
				// If forceVerify is true, regenerate proactively to avoid 401 errors
				// If forceVerify is false, still return cached token but log warning
				// (will be regenerated when we get 401 error)
				if (forceVerify) {
					console.log(`⚠️ Token verification failed (status: ${status}) - regenerating proactively...`)
					verificationFailureCount.delete(cacheKey) // Reset count since we're regenerating
					// Invalidate and regenerate
					tokenCache.delete(cacheKey)
					return generateToken(email, true)
				}
				
				// Not forcing verification - increment failure count but still return cached token
				// Will be regenerated reactively when we get 401
				verificationFailureCount.set(cacheKey, failureCount + 1)
				tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
				console.warn(`⚠️ Token verification failed (status: ${status}) but not forcing regeneration - will regenerate on 401`)
				return cached.token
			} catch (error) {
				// Verification endpoint itself failed (network error, etc.)
				// Increment failure count but don't regenerate token - it might still be valid
				verificationFailureCount.set(cacheKey, failureCount + 1)
				// Update timestamp to avoid spamming verification, but don't reset failure count
				tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
				return cached.token
			}
		}

		return cached.token
	}

	// No valid cached token - generate a new one
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

interface VerifyTokenParams {
	token: string
	orgInviteCode: string
}

export async function verifyAuthToken({
	token,
	orgInviteCode,
}: VerifyTokenParams): Promise<{
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
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				org_invite_code: orgInviteCode,
			}),
		}
	)

	if (!response.ok) {
		const errorText = await response.text()
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
