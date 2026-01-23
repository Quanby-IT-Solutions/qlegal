export function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
	const normalized = (fullName ?? "").trim()
	if (!normalized) return { firstName: "User", lastName: "" }
	const parts = normalized.split(/\s+/).filter(Boolean)
	return { firstName: parts[0] ?? "User", lastName: parts.slice(1).join(" ") || "" }
}

export function normalizeUrl(url: string | null | undefined): string | null {
	if (!url || typeof url !== "string") return null

	let normalized = url.replace(/api=null/gi, "api=true")

	try {
		const urlObj = new URL(normalized)
		urlObj.searchParams.set("api", "true")
		return urlObj.toString()
	} catch {
		if (!normalized.includes("api=")) {
			const separator = normalized.includes("?") ? "&" : "?"
			normalized = `${normalized}${separator}api=true`
		}
		return normalized
	}
}

export function normalizeUrlRequired(url: string | null | undefined): string {
	const normalized = normalizeUrl(url)
	if (!normalized) {
		throw new Error("Invalid or missing doconchain URL")
	}
	return normalized
}
