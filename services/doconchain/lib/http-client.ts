import { generateToken, getToken, invalidateToken } from "./token-cache"

type ApiCallFn = (token: string) => Promise<Response>

export async function apiCall(fn: ApiCallFn, userEmail?: string, forceVerify = false): Promise<Response> {
	// Get token - force verification for critical operations (project creation, link generation)
	// For non-critical operations, use periodic verification (every 10 min)
	// This ensures we have a fresh, valid token for important API calls
	const token = await getToken(userEmail, forceVerify)
	let response = await fn(token)

	// If we get 401, the token might have expired or the user doesn't have access
	// Invalidate and regenerate, then retry once
	if (response.status === 401) {
		const emailForLog = userEmail ?? "default"
		console.log(`🔵 Received 401 Unauthorized for ${emailForLog} - token may have expired, invalidating cache and regenerating...`)
		
		// CRITICAL: Invalidate token cache BEFORE regenerating to ensure we get a completely fresh token
		invalidateToken(userEmail)
		
		// Small delay to ensure cache is cleared
		await new Promise(resolve => setTimeout(resolve, 100))
		
		// Force generate a completely new token
		const newToken = await generateToken(userEmail, true)
		console.log(`✅ Generated new token for ${emailForLog}, retrying request...`)
		
		response = await fn(newToken)
		
		// If still 401 after regeneration, the user likely doesn't have permission
		if (response.status === 401) {
			const errorText = await response.text().catch(() => "Unknown error")
			console.error(`❌ Still getting 401 after token regeneration for ${emailForLog}`)
			console.error(`   Error response: ${errorText}`)
			
			let errorMessage: string
			const errorLower = errorText.toLowerCase()
			
			if (errorLower.includes("session") || errorLower.includes("expired")) {
				errorMessage = "Session expired. Please try again - a fresh token will be generated."
			} else if (errorLower.includes("unauthorized") || errorLower.includes("access")) {
				// Provide more helpful error message for unauthorized access
				const errorPreview = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText
				errorMessage = `Unauthorized access: The user (${emailForLog}) may not have permission to access this resource.\n\nThis could mean:\n- The user doesn't have access to this project\n- The user's token doesn't have the required permissions\n- The project was created by a different user\n\nError details: ${errorPreview}`
			} else {
				const errorPreview = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText
				errorMessage = `Authentication failed after token regeneration (${response.status}): ${errorPreview}`
			}
			throw new Error(errorMessage)
		}
		
		console.log(`✅ Request succeeded after token regeneration for ${emailForLog}`)
	}

	return response
}
