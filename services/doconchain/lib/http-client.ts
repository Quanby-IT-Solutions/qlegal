import { generateToken, getToken, invalidateToken } from "./token-cache"

type ApiCallFn = (token: string) => Promise<Response>

export async function apiCall(fn: ApiCallFn, userEmail?: string, forceVerify = false): Promise<Response> {
	// Get token - force verification for critical operations (project creation, link generation)
	// For non-critical operations, use periodic verification (every 10 min)
	// This ensures we have a fresh, valid token for important API calls
	const token = await getToken(userEmail, forceVerify)
	
	// Retry logic for network errors (timeouts, connection failures)
	const maxRetries = 3
	let lastError: Error | null = null
	
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
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
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))
			const emailForLog = userEmail ?? "default"
			
			// Check if it's a network timeout/connection error
			const isNetworkError =
				error instanceof Error &&
				(error.message.includes("timeout") ||
					error.message.includes("Timeout") ||
					error.message.includes("ECONNRESET") ||
					error.message.includes("ENOTFOUND") ||
					error.message.includes("ECONNREFUSED") ||
					error.message.includes("fetch failed") ||
					(error as { code?: string }).code === "UND_ERR_CONNECT_TIMEOUT")
			
			if (isNetworkError && attempt < maxRetries - 1) {
				// Exponential backoff: 1s, 2s, 4s
				const delay = Math.pow(2, attempt) * 1000
				console.warn(
					`⚠️ Network error (attempt ${attempt + 1}/${maxRetries}) for ${emailForLog}: ${lastError.message} - retrying in ${delay}ms...`
				)
				await new Promise(resolve => setTimeout(resolve, delay))
				continue // Retry
			}
			
			// If it's not a network error or we've exhausted retries, throw
			throw lastError
		}
	}
	
	// This should never be reached, but TypeScript needs it
	throw lastError ?? new Error("Unknown error in apiCall")
}
