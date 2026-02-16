export function formatElapsedMs(diffMs: number) {
	const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

/** Pre-generated Plot/Sign links can go stale (api_token expires). Max age before we regenerate on click. */
export const PRE_GENERATED_LINK_MAX_AGE_MS = 2 * 60 * 1000

/** Interval for proactively clearing stale links (ms). */
export const STALE_LINK_CHECK_INTERVAL_MS = 60_000

export function forceApiTruePreservingParams(urlStr: string): string {
	try {
		const url = new URL(urlStr)
		url.searchParams.set("api", "true")
		return url.toString()
	} catch {
		return urlStr
	}
}
