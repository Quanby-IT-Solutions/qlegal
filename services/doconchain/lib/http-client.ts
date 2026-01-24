import { generateToken, getToken, invalidateToken } from "./token-cache"

type ApiCallFn = (token: string) => Promise<Response>

export async function apiCall(fn: ApiCallFn, userEmail?: string): Promise<Response> {
	// Get token - verification happens periodically, not on every call
	// This prevents infinite loops when verification itself fails
	const token = await getToken(userEmail, false)
	let response = await fn(token)

	// If we get 401, the token might have expired
	// Invalidate and regenerate, then retry once
	if (response.status === 401) {
		console.log("🔵 Received 401 Unauthorized - token may have expired, regenerating...")
		invalidateToken(userEmail)
		const newToken = await generateToken(userEmail, true)
		response = await fn(newToken)
		
		// If still 401 after regeneration, throw error
		if (response.status === 401) {
			const errorText = await response.text().catch(() => "Unknown error")
			throw new Error(`Authentication failed after token regeneration: ${response.status} - ${errorText}`)
		}
	}

	return response
}
