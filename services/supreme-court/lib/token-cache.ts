import { env } from "@/env"

import { TOKEN_EXPIRATION_MS, TOKEN_REFRESH_BUFFER_MS } from "./config"

interface CachedToken {
	token: string
	expiresAt: number
}

let cachedToken: CachedToken | null = null

function isTokenValid(entry: CachedToken | null): entry is CachedToken {
	return !!entry && Date.now() < entry.expiresAt - TOKEN_REFRESH_BUFFER_MS
}

/**
 * Check if Supreme Court API is configured (credentials present).
 */
export function isConfigured(): boolean {
	return !!(
		env.SUPREME_COURT_COGNITO_URL &&
		env.SUPREME_COURT_CLIENT_ID &&
		env.SUPREME_COURT_USERNAME &&
		env.SUPREME_COURT_PASSWORD
	)
}

/**
 * Generate a new access token via AWS Cognito InitiateAuth.
 */
export async function generateToken(): Promise<string> {
	const cognitoUrl = env.SUPREME_COURT_COGNITO_URL
	const clientId = env.SUPREME_COURT_CLIENT_ID
	const username = env.SUPREME_COURT_USERNAME
	const password = env.SUPREME_COURT_PASSWORD

	if (!cognitoUrl || !clientId || !username || !password) {
		throw new Error(
			"Supreme Court API not configured: SUPREME_COURT_COGNITO_URL, CLIENT_ID, USERNAME, and PASSWORD are required"
		)
	}

	console.log("🔵 [Supreme Court] Authenticating with Cognito...")
	console.log("   URL:", cognitoUrl)
	console.log("   ClientId:", clientId)
	console.log("   Username:", username)

	let response: Response
	try {
		response = await fetch(cognitoUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-amz-json-1.1",
				"X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
			},
			body: JSON.stringify({
				AuthFlow: "USER_PASSWORD_AUTH",
				AuthParameters: {
					PASSWORD: password,
					USERNAME: username,
				},
				ClientId: clientId,
				ClientMetadata: {},
			}),
		})
	} catch (err) {
		const cause = err instanceof Error ? err.cause : undefined
		const causeMsg = cause instanceof Error ? cause.message : String(cause ?? "")
		const code = cause && typeof cause === "object" && "code" in cause ? (cause as { code: string }).code : ""
		throw new Error(
			`Supreme Court Cognito auth request failed (network error). ${causeMsg || (err instanceof Error ? err.message : String(err))}` +
				(code ? ` (${code})` : "") +
				`\n\n   Possible causes: no internet, firewall/VPN blocking, DNS failure, or wrong SUPREME_COURT_COGNITO_URL.`
		)
	}

	console.log("🔵 [Supreme Court] Cognito response status:", response.status, response.statusText)

	if (!response.ok) {
		const errorText = await response.text()
		let errorMessage = `Supreme Court Cognito auth failed: ${response.status} - ${errorText}`
		try {
			const errorJson = JSON.parse(errorText)
			if (errorJson.__type || errorJson.message) {
				errorMessage = `Supreme Court Cognito auth failed: ${errorJson.__type || "Error"} - ${errorJson.message || errorText}`
			}
		} catch {
			// Not JSON, use original error text
		}
		throw new Error(errorMessage)
	}

	const responseText = await response.text()
	console.log("🔵 [Supreme Court] Cognito response body:", responseText.substring(0, 500))

	let data: {
		AuthenticationResult?: {
			AccessToken?: string
			ExpiresIn?: number
		}
		ChallengeName?: string
		Session?: string
		ChallengeParameters?: {
			USER_ID_FOR_SRP?: string
			requiredAttributes?: string
			userAttributes?: string
		}
		__type?: string
		message?: string
	}

	try {
		data = JSON.parse(responseText) as typeof data
		console.log("🔵 [Supreme Court] Parsed response:", JSON.stringify(data, null, 2))
	} catch (parseError) {
		console.error("❌ [Supreme Court] Failed to parse response as JSON:", parseError)
		throw new Error(
			`Supreme Court Cognito auth response is not valid JSON: ${responseText.substring(0, 200)}`
		)
	}

	// Handle NEW_PASSWORD_REQUIRED challenge
	if (data.ChallengeName === "NEW_PASSWORD_REQUIRED" && data.Session) {
		console.log("🔵 [Supreme Court] Handling NEW_PASSWORD_REQUIRED challenge...")
		
		// Respond to the challenge by setting the new password (using the same password)
		const challengeResponse = await fetch(cognitoUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-amz-json-1.1",
				"X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
			},
			body: JSON.stringify({
				ChallengeName: "NEW_PASSWORD_REQUIRED",
				ClientId: clientId,
				ChallengeResponses: {
					USERNAME: username,
					NEW_PASSWORD: password, // Use the same password
				},
				Session: data.Session,
			}),
		})

		if (!challengeResponse.ok) {
			const errorText = await challengeResponse.text()
			let errorMessage = `Supreme Court Cognito challenge response failed: ${challengeResponse.status} - ${errorText}`
			try {
				const errorJson = JSON.parse(errorText)
				if (errorJson.__type || errorJson.message) {
					errorMessage = `Supreme Court Cognito challenge failed: ${errorJson.__type || "Error"} - ${errorJson.message || errorText}`
				}
			} catch {
				// Not JSON, use original error text
			}
			throw new Error(errorMessage)
		}

		const challengeResponseText = await challengeResponse.text()
		console.log("🔵 [Supreme Court] Challenge response:", challengeResponseText.substring(0, 500))

		const challengeData = JSON.parse(challengeResponseText) as {
			AuthenticationResult?: {
				AccessToken?: string
				ExpiresIn?: number
			}
			__type?: string
			message?: string
		}

		if (challengeData.__type || (challengeData.message && !challengeData.AuthenticationResult)) {
			throw new Error(
				`Supreme Court Cognito challenge error: ${challengeData.__type || "Unknown"} - ${challengeData.message || "Challenge failed"}`
			)
		}

		const accessToken = challengeData.AuthenticationResult?.AccessToken
		if (!accessToken) {
			console.error("❌ [Supreme Court] AccessToken missing from challenge response")
			console.error("   Challenge response:", JSON.stringify(challengeData, null, 2))
			throw new Error(
				`Supreme Court challenge response missing AccessToken. Response: ${JSON.stringify(challengeData).substring(0, 500)}`
			)
		}

		console.log("✅ [Supreme Court] Successfully obtained AccessToken after challenge")

		const expiresIn = challengeData.AuthenticationResult?.ExpiresIn ?? 3600
		cachedToken = {
			token: accessToken,
			expiresAt: Date.now() + expiresIn * 1000,
		}

		return accessToken
	}

	// Check for Cognito error responses (they can return 200 with error in body)
	if (data.__type || (data.message && !data.AuthenticationResult)) {
		console.error("❌ [Supreme Court] Cognito returned error in response body")
		throw new Error(
			`Supreme Court Cognito auth error: ${data.__type || "Unknown"} - ${data.message || "Authentication failed"}`
		)
	}

	const accessToken = data.AuthenticationResult?.AccessToken
	if (!accessToken) {
		console.error("❌ [Supreme Court] AccessToken missing from response")
		console.error("   Full response structure:", JSON.stringify(data, null, 2))
		throw new Error(
			`Supreme Court auth response missing AccessToken. Response: ${JSON.stringify(data).substring(0, 500)}`
		)
	}

	console.log("✅ [Supreme Court] Successfully obtained AccessToken")

	const expiresIn = data.AuthenticationResult?.ExpiresIn ?? 3600
	cachedToken = {
		token: accessToken,
		expiresAt: Date.now() + expiresIn * 1000,
	}

	return accessToken
}

/**
 * Get a valid access token, using cache if available and not expired.
 */
export async function getToken(forceRefresh = false): Promise<string> {
	if (!forceRefresh && isTokenValid(cachedToken)) {
		return cachedToken!.token
	}

	return generateToken()
}

/**
 * Invalidate the cached token (e.g. after 401).
 */
export function invalidateToken(): void {
	cachedToken = null
}

/**
 * Decode JWT token to extract user information (groups, username, etc.)
 * This is a simple base64 decode - we don't verify the signature.
 */
export function decodeToken(token: string): {
	username?: string
	groups?: string[]
	sub?: string
	exp?: number
	iat?: number
} {
	try {
		const parts = token.split(".")
		if (parts.length !== 3) {
			return {}
		}

		// Decode the payload (second part)
		const payload = parts[1]!
		// Add padding if needed for base64 decode
		const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4)
		const decoded = Buffer.from(paddedPayload, "base64").toString("utf-8")
		const parsed = JSON.parse(decoded) as {
			username?: string
			"cognito:groups"?: string[]
			sub?: string
			exp?: number
			iat?: number
		}

		return {
			username: parsed.username,
			groups: parsed["cognito:groups"],
			sub: parsed.sub,
			exp: parsed.exp,
			iat: parsed.iat,
		}
	} catch (error) {
		console.warn("Failed to decode token:", error)
		return {}
	}
}

/**
 * Get the current cached token (for debugging).
 */
export function getCachedToken(): string | null {
	return cachedToken?.token ?? null
}
