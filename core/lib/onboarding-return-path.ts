/**
 * Validates a path for use as `returnTo` after KYC onboarding.
 * Only same-app relative paths are allowed (no open redirects).
 */
export function getSafeOnboardingReturnPath(raw: string | null | undefined): string | null {
	if (raw === null || raw === undefined || typeof raw !== "string") return null
	const trimmed = raw.trim()
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null
	if (trimmed.includes("://") || trimmed.includes("..")) return null
	const pathOnly = trimmed.replace(/[?#].*$/, "")
	if (!pathOnly.startsWith("/") || pathOnly.length > 512) return null
	return pathOnly
}

export function buildOnboardingKycUrl(
	returnToPath?: string | null,
	options?: { autoStart?: boolean }
): string {
	const parts = ["focus=kyc"] as string[]
	const safe = returnToPath ? getSafeOnboardingReturnPath(returnToPath) : null
	if (safe) parts.push(`returnTo=${encodeURIComponent(safe)}`)
	if (options?.autoStart) parts.push("autoStart=1")
	return `/onboarding?${parts.join("&")}`
}
