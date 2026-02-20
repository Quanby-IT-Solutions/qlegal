// ─────────────────────────────────────────────────────────────
// Timing constants
// ─────────────────────────────────────────────────────────────

/** Pre-generated Plot/Sign links can go stale (api_token expires). Max age before we regenerate on click. */
export const PRE_GENERATED_LINK_MAX_AGE_MS = 2 * 60 * 1000

/** Interval for proactively clearing stale links (ms). */
export const STALE_LINK_CHECK_INTERVAL_MS = 60_000

/** After DocOnChain reports COMPLETED, give the seal a moment to apply. */
export const SEALED_DOCUMENT_SETTLE_DELAY_MS = 5_000

// ─────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────

export type PopupSizePreset = "signing"

export type PreGeneratedLinkEntry = {
	link: string
	projectUuid: string
	storedAt: number
	cleanPlotUrl?: string
}

export type RecordingConsentRequest = {
	id: string
	createdAt: number
	initiatorName: string
	requiredParticipantIds: string[]
}

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────

export function formatElapsedMs(diffMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// ─────────────────────────────────────────────────────────────
// Popup helper
// ─────────────────────────────────────────────────────────────

export function openCenteredPopup(
	url: string,
	name: string,
	preset: PopupSizePreset = "signing"
): Window | null {
	const availW = Math.max(0, window.screen.availWidth || window.innerWidth || 0)
	const availH = Math.max(0, window.screen.availHeight || window.innerHeight || 0)

	const target = preset === "signing" ? { w: 0.88, h: 0.9 } : { w: 0.88, h: 0.9 }
	const minW = 1024
	const minH = 720
	const maxW = 2200
	const maxH = 1400

	const width = Math.floor(Math.min(maxW, Math.max(minW, availW * target.w)))
	const height = Math.floor(Math.min(maxH, Math.max(minH, availH * target.h)))

	const left = Math.floor(window.screenX + (window.outerWidth - width) / 2)
	const top = Math.floor(window.screenY + (window.outerHeight - height) / 2)

	const features = [
		`width=${width}`,
		`height=${height}`,
		`left=${left}`,
		`top=${top}`,
		"resizable=yes",
		"scrollbars=yes",
		"toolbar=no",
		"location=no",
		"menubar=no",
	].join(",")

	return window.open(url, name, features)
}

// ─────────────────────────────────────────────────────────────
// DocOnChain link extraction helpers
// ─────────────────────────────────────────────────────────────

export function extractDoconchainLink(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim()
		if (!trimmed) return undefined
		if (/^https?:\/\/link\.doconchain\.com\//i.test(trimmed)) return trimmed
		if (/^https?:\/\/([a-z0-9-]+\.)?doconchain\.com\//i.test(trimmed)) return trimmed
		return undefined
	}

	if (!value || typeof value !== "object") return undefined

	const record = value as Record<string, unknown>
	const direct = record.link ?? record.url
	const directFound = extractDoconchainLink(direct)
	if (directFound) return directFound

	const messageFound = extractDoconchainLink(record.message)
	if (messageFound) return messageFound

	const dataFound = extractDoconchainLink(record.data)
	if (dataFound) return dataFound

	for (const v of Object.values(record)) {
		const found = extractDoconchainLink(v)
		if (found) return found
	}
	return undefined
}

export function redactDoconchainUrlForLog(urlString: string): string {
	try {
		const url = new URL(urlString)
		for (const key of ["token", "api_token"]) {
			if (url.searchParams.has(key)) url.searchParams.set(key, "***")
		}
		if (url.searchParams.has("email")) url.searchParams.set("email", "***")
		return url.toString()
	} catch {
		return urlString
	}
}

export function sanitizeDoconchainPayloadForLog(value: unknown): unknown {
	if (typeof value === "string") {
		return extractDoconchainLink(value) ? redactDoconchainUrlForLog(value) : value
	}
	if (!value || typeof value !== "object") return value
	if (Array.isArray(value)) return value.map(v => sanitizeDoconchainPayloadForLog(v))
	const record = value as Record<string, unknown>
	const out: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(record)) {
		out[k] = sanitizeDoconchainPayloadForLog(v)
	}
	return out
}
