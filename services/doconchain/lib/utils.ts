export function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
	const normalized = (fullName ?? "").trim()
	if (!normalized) return { firstName: "User", lastName: "" }
	const parts = normalized.split(/\s+/).filter(Boolean)
	return { firstName: parts[0] ?? "User", lastName: parts.slice(1).join(" ") || "" }
}

/**
 * Normalize DocoChain URLs: convert stg-app/app to link.doconchain.com,
 * remove sensitive params (token, email, signer_role, page), ensure api=true.
 * CRITICAL: Prevents exposing staging URLs and credentials in the address bar.
 */
export function normalizeUrl(url: string | null | undefined): string | null {
	if (!url || typeof url !== "string") return null

	let normalized = url.replace(/api=null/gi, "api=true")

	try {
		const urlObj = new URL(normalized)
		// CRITICAL: Convert stg-app/app.doconchain.com to link.doconchain.com (never expose staging URL)
		if (
			urlObj.hostname.includes("stg-app.doconchain.com") ||
			urlObj.hostname.includes("app.doconchain.com")
		) {
			urlObj.hostname = "link.doconchain.com"
		}
		// Remove sensitive params that should never appear in user-facing URLs
		urlObj.searchParams.delete("token")
		urlObj.searchParams.delete("email")
		urlObj.searchParams.delete("signer_role")
		urlObj.searchParams.delete("page")
		urlObj.searchParams.set("api", "true")
		return urlObj.toString()
	} catch {
		// Fallback: manual cleanup when URL parsing fails
		if (!normalized.includes("api=")) {
			const separator = normalized.includes("?") ? "&" : "?"
			normalized = `${normalized}${separator}api=true`
		}
		normalized = normalized.replace(/[?&]token=[^&]*/g, "")
		normalized = normalized.replace(/[?&]email=[^&]*/g, "")
		normalized = normalized.replace(/[?&]signer_role=[^&]*/g, "")
		normalized = normalized.replace(/[?&]page=[^&]*/g, "")
		normalized = normalized.replace(
			/https?:\/\/(stg-)?app\.doconchain\.com\//g,
			"https://link.doconchain.com/"
		)
		// Clean up double separators
		while (normalized.includes("&&")) normalized = normalized.replace(/&&/g, "&")
		if (normalized.includes("?&")) normalized = normalized.replace(/\?&/g, "?")
		return normalized.replace(/\?$/, "")
	}
}

export function normalizeUrlRequired(url: string | null | undefined): string {
	const normalized = normalizeUrl(url)
	if (!normalized) {
		throw new Error("Invalid or missing doconchain URL")
	}
	return normalized
}
