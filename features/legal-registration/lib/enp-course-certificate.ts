/** Placeholder LMS / certificate state (client-only persistence until real LMS exists). */

export const ENP_COURSE_CERT_STORAGE_PREFIX = "qsign:enp-course-certificate:v1"

/** Dispatched on `window` after certificate download so listeners can sync without a full reload. */
export const ENP_COURSE_CERT_CHANGED_EVENT = "qsign:enp-course-certificate-changed"

export function getEnpCourseCertStorageKey(userId: string | undefined): string | null {
	if (!userId) return null
	return `${ENP_COURSE_CERT_STORAGE_PREFIX}:${userId}`
}

export function readEnpCourseCertificateDownloadedAt(userId: string | undefined): string | null {
	if (typeof window === "undefined") return null
	try {
		const key = getEnpCourseCertStorageKey(userId)
		if (!key) return null
		const raw = window.localStorage.getItem(key)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { downloadedAt?: string } | null
		if (!parsed?.downloadedAt) return null
		return parsed.downloadedAt
	} catch {
		return null
	}
}

export function writeEnpCourseCertificateDownloaded(userId: string | undefined, downloadedAtIso: string) {
	if (typeof window === "undefined") return
	try {
		const key = getEnpCourseCertStorageKey(userId)
		if (!key) return
		window.localStorage.setItem(key, JSON.stringify({ downloadedAt: downloadedAtIso }))
		window.dispatchEvent(new Event(ENP_COURSE_CERT_CHANGED_EVENT))
	} catch {
		// ignore: localStorage may be blocked
	}
}
