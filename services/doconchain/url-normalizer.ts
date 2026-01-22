/**
 * Normalizes DocoChain URLs to ensure api=true is ALWAYS set
 * This function MUST be called on EVERY URL before it's stored, returned, or used
 *
 * @param url - The URL string to normalize
 * @returns Normalized URL with api=true (never api=null)
 */
export function normalizeDocoChainUrl(url: string | null | undefined): string | null {
	if (!url || typeof url !== "string") {
		return url ?? null
	}

	// FIRST: Aggressive string replacement BEFORE URL parsing to catch api=null
	let normalized = url
	// Replace api=null with api=true (multiple passes for safety)
	normalized = normalized.replace(/api=null/gi, "api=true")
	normalized = normalized.replace(/\?api=null(&|$)/gi, "?api=true$1")
	normalized = normalized.replace(/&api=null(&|$)/gi, "&api=true$1")
	// Final pass for any remaining api=null
	normalized = normalized.replace(/api=null/gi, "api=true")

	try {
		const urlObj = new URL(normalized)
		
		// CRITICAL: ALWAYS set api=true - no exceptions, no matter what
		urlObj.searchParams.set("api", "true")

		// Return the normalized URL
		return urlObj.toString()
	} catch {
		// If URL parsing fails, use aggressive string replacement
		// If api parameter is missing, add api=true
		if (!normalized.includes("api=")) {
			const separator = normalized.includes("?") ? "&" : "?"
			normalized = `${normalized}${separator}api=true`
		} else if (normalized.includes("api=null")) {
			// Final safety check - if api=null still exists (shouldn't happen), replace it
			normalized = normalized.replace(/api=null/gi, "api=true")
		}

		return normalized
	}
}

/**
 * Normalizes a DocoChain URL and throws an error if normalization fails
 * Use this when the URL is required and must be valid
 */
export function normalizeDocoChainUrlRequired(url: string | null | undefined): string {
	const normalized = normalizeDocoChainUrl(url)
	if (!normalized) {
		throw new Error("Invalid or missing DocoChain URL")
	}
	return normalized
}
