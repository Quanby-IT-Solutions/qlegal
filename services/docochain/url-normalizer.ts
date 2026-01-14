/**
 * Normalizes DocoChain URLs to ensure api=true is ALWAYS set
 * This function MUST be called on EVERY URL before it's stored, returned, or used
 * 
 * @param url - The URL string to normalize
 * @returns Normalized URL with api=true (never api=null)
 */
export function normalizeDocoChainUrl(url: string | null | undefined): string | null {
	if (!url || typeof url !== 'string') {
		return url ?? null
	}

	try {
		const urlObj = new URL(url)
		const apiValue = urlObj.searchParams.get('api')
		
		// ALWAYS set api=true - no exceptions
		// If api parameter exists but is null, empty, or not 'true', fix it
		if (urlObj.searchParams.has('api')) {
			if (apiValue === 'null' || apiValue === '' || apiValue === null || apiValue !== 'true') {
				urlObj.searchParams.set('api', 'true')
			}
		} else {
			// Add api=true if not present (this is an API-generated link)
			urlObj.searchParams.set('api', 'true')
		}
		
		return urlObj.toString()
	} catch {
		// If URL parsing fails, use aggressive string replacement
		let normalized = url
		
		// Multiple passes to catch all variations
		normalized = normalized.replace(/\?api=null(&|$)/g, '?api=true$1')
		normalized = normalized.replace(/&api=null(&|$)/g, '&api=true$1')
		normalized = normalized.replace(/\?api=null(&|$)/g, '?api=true$1') // Second pass
		normalized = normalized.replace(/&api=null(&|$)/g, '&api=true$1') // Second pass
		
		// Use global replace for any remaining api=null
		if (normalized.includes('api=null')) {
			normalized = normalized.replace(/[?&]api=null/g, (match) => match.replace('api=null', 'api=true'))
		}
		
		// If api parameter is missing, add api=true
		if (!normalized.includes('api=')) {
			const separator = normalized.includes('?') ? '&' : '?'
			normalized = `${normalized}${separator}api=true`
		} else if (normalized.includes('api=null')) {
			// Final safety check - if api=null still exists, replace it
			normalized = normalized.replace(/api=null/g, 'api=true')
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
		throw new Error('Invalid or missing DocoChain URL')
	}
	return normalized
}
