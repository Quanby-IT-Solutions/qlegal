/** Placeholder until Supreme Court credential submission is integrated with QLegal. */

export const ENP_SC_CREDENTIALS_STORAGE_PREFIX = "qsign:enp-sc-credentials:v1"

export const ENP_SC_CREDENTIALS_CHANGED_EVENT = "qsign:enp-sc-credentials-changed"

export function getEnpScCredentialsStorageKey(userId: string | undefined): string | null {
	if (!userId) return null
	return `${ENP_SC_CREDENTIALS_STORAGE_PREFIX}:${userId}`
}

export function readEnpScCredentialsRecordedAt(userId: string | undefined): string | null {
	if (typeof window === "undefined") return null
	try {
		const key = getEnpScCredentialsStorageKey(userId)
		if (!key) return null
		const raw = window.localStorage.getItem(key)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { recordedAt?: string } | null
		if (!parsed?.recordedAt) return null
		return parsed.recordedAt
	} catch {
		return null
	}
}

export function writeEnpScCredentialsRecorded(userId: string | undefined, recordedAtIso: string) {
	if (typeof window === "undefined") return
	try {
		const key = getEnpScCredentialsStorageKey(userId)
		if (!key) return
		window.localStorage.setItem(key, JSON.stringify({ recordedAt: recordedAtIso }))
		window.dispatchEvent(new Event(ENP_SC_CREDENTIALS_CHANGED_EVENT))
	} catch {
		// ignore
	}
}
