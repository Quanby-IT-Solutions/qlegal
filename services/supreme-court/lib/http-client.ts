import { env } from "@/env"

import { getToken, invalidateToken, isConfigured } from "./token-cache"

type ApiCallFn = (token: string) => Promise<Response>

/**
 * Execute an authenticated request to the Supreme Court eNotarization API.
 * Handles token refresh on 401.
 */
export async function apiCall(fn: ApiCallFn): Promise<Response> {
	if (!isConfigured()) {
		throw new Error("Supreme Court API is not configured. Check env vars.")
	}

	const baseUrl = env.SUPREME_COURT_API_URL
	if (!baseUrl) {
		throw new Error("SUPREME_COURT_API_URL is not set")
	}

	const token = await getToken()

	const maxRetries = 3
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			let response = await fn(token)

			if (response.status === 401) {
				console.log("Supreme Court API 401 - invalidating token and retrying...")
				invalidateToken()
				const newToken = await getToken()
				response = await fn(newToken)

				if (response.status === 401) {
					const errorText = await response.text().catch(() => "Unknown error")
					throw new Error(`Supreme Court API unauthorized after token refresh: ${errorText}`)
				}
			}

			return response
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))
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
				const delay = Math.pow(2, attempt) * 1000
				console.warn(
					`Supreme Court API network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`
				)
				await new Promise(resolve => setTimeout(resolve, delay))
				continue
			}

			throw lastError
		}
	}

	throw lastError ?? new Error("Unknown error in Supreme Court apiCall")
}

/**
 * Make a GET request to the Supreme Court API.
 */
export async function get(path: string): Promise<Response> {
	return apiCall(async token => {
		const url = path.startsWith("http") ? path : `${env.SUPREME_COURT_API_URL}${path}`
		return fetch(url, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
				"Accept": "application/json",
			},
		})
	})
}

/**
 * Make a POST request to the Supreme Court API.
 */
export async function post(path: string, body: unknown): Promise<Response> {
	return apiCall(async token => {
		const url = path.startsWith("http") ? path : `${env.SUPREME_COURT_API_URL}${path}`
		return fetch(url, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
				"Accept": "application/json",
			},
			body: JSON.stringify(body),
		})
	})
}
