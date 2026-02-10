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

	const response = await fetch(cognitoUrl, {
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

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Supreme Court Cognito auth failed: ${response.status} - ${errorText}`)
	}

	const data = (await response.json()) as {
		AuthenticationResult?: {
			AccessToken?: string
			ExpiresIn?: number
		}
	}

	const accessToken = data.AuthenticationResult?.AccessToken
	if (!accessToken) {
		throw new Error("Supreme Court auth response missing AccessToken")
	}

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
