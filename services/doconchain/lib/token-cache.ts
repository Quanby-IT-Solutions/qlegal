import { cache } from "react"

import { env } from "@/env"

import { TOKEN_EXPIRATION_MS, TOKEN_REFRESH_BUFFER_MS } from "./config"

interface CachedToken {
	token: string
	expiresAt: number
	lastVerifiedAt: number
}

const tokenCache = new Map<string, CachedToken>()

function isTokenValid(entry: CachedToken | undefined): entry is CachedToken {
	return !!entry && Date.now() < entry.expiresAt - TOKEN_REFRESH_BUFFER_MS
}

const TOKEN_VERIFY_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

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

	return token
}

export async function getToken(email?: string): Promise<string> {
	const cacheKey = email ?? env.DOCONCHAIN_EMAIL
	const cached = tokenCache.get(cacheKey)

	if (cached && isTokenValid(cached)) {
		// Proactively verify token validity with DocoChain periodically
		// so we can refresh before it causes downstream failures.
		if (Date.now() - cached.lastVerifiedAt > TOKEN_VERIFY_INTERVAL_MS) {
			try {
				const verify = await verifyAuthToken({
					token: cached.token,
					orgInviteCode: env.DOCONCHAIN_ORG_INVITE_CODE,
				})

				const status = String(verify?.data?.status ?? "").toLowerCase()
				if (status !== "active") {
					invalidateToken(email)
					return generateToken(email, true)
				}

				tokenCache.set(cacheKey, { ...cached, lastVerifiedAt: Date.now() })
			} catch {
				// Any verification failure means the token may be invalid/expired.
				// Clear cache and regenerate.
				invalidateToken(email)
				return generateToken(email, true)
			}
		}

		return cached.token
	}

	return generateToken(email, true)
}

export const getCachedToken = cache(async (email?: string): Promise<string> => {
	return getToken(email)
})

export function invalidateToken(email?: string): void {
	const cacheKey = email ?? env.DOCONCHAIN_EMAIL
	tokenCache.delete(cacheKey)
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
		throw new Error(`doconchain token verification failed: ${response.status} - ${errorText}`)
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
