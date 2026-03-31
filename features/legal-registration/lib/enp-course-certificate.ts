/** Placeholder LMS / certificate state (client-only persistence until real LMS exists). */

export const ENP_COURSE_CERT_STORAGE_PREFIX = "qsign:enp-course-certificate:v1"

/** Dispatched on `window` after certificate download so listeners can sync without a full reload. */
export const ENP_COURSE_CERT_CHANGED_EVENT = "qsign:enp-course-certificate-changed"

function normalizeEmail(email: string | null | undefined): string | null {
	if (!email || typeof email !== "string") return null
	const t = email.trim().toLowerCase()
	return t.length > 0 ? t : null
}

/** All localStorage keys that may hold this user’s certificate timestamp (id + email for resilience). */
export function getEnpCourseCertStorageKeys(
	userId: string | undefined,
	email?: string | null
): string[] {
	const keys: string[] = []
	if (userId) keys.push(`${ENP_COURSE_CERT_STORAGE_PREFIX}:${userId}`)
	const ne = normalizeEmail(email)
	if (ne) keys.push(`${ENP_COURSE_CERT_STORAGE_PREFIX}:email:${encodeURIComponent(ne)}`)
	return keys
}

/** Single key when only `userId` is used (legacy listeners). */
export function getEnpCourseCertStorageKey(userId: string | undefined): string | null {
	if (!userId) return null
	return `${ENP_COURSE_CERT_STORAGE_PREFIX}:${userId}`
}

function parseDownloadedAt(raw: string | null): string | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw) as { downloadedAt?: string } | null
		if (!parsed?.downloadedAt) return null
		return parsed.downloadedAt
	} catch {
		return null
	}
}

function pickLatestIso(a: string | null, b: string | null): string | null {
	if (!a) return b
	if (!b) return a
	return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

export function readEnpCourseCertificateDownloadedAt(
	userId: string | undefined,
	email?: string | null
): string | null {
	if (typeof window === "undefined") return null
	try {
		let best: string | null = null
		for (const key of getEnpCourseCertStorageKeys(userId, email)) {
			best = pickLatestIso(best, parseDownloadedAt(window.localStorage.getItem(key)))
		}
		return best
	} catch {
		return null
	}
}

export function writeEnpCourseCertificateDownloaded(
	userId: string | undefined,
	email: string | null | undefined,
	downloadedAtIso: string
) {
	if (typeof window === "undefined") return
	const keys = getEnpCourseCertStorageKeys(userId, email)
	if (keys.length === 0) return
	try {
		const payload = JSON.stringify({ downloadedAt: downloadedAtIso })
		for (const key of keys) {
			window.localStorage.setItem(key, payload)
		}
		window.dispatchEvent(new Event(ENP_COURSE_CERT_CHANGED_EVENT))
	} catch {
		// ignore: localStorage may be blocked
	}
}
