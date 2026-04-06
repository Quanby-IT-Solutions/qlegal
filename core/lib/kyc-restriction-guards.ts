import { TRPCError } from "@trpc/server"

/** Shared: KYC not yet complete for flows that require verification. */
export function isKycNotStartedOrPending(kycStatus: string | null | undefined): boolean {
	const status = kycStatus ?? "NOT_STARTED"
	return status === "NOT_STARTED" || status === "PENDING"
}

/**
 * ENP and Principal users must finish identity verification before booking an
 * Electronic Notary Public from the browse flow.
 */
export function isLawyerBookingBlockedForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): boolean {
	if (role !== "ENP" && role !== "PRINCIPAL") return false
	return isKycNotStartedOrPending(kycStatus)
}

/**
 * ENP users must finish identity verification before creating a meeting (ad-hoc session flow).
 */
export function isEnpMeetingCreationBlockedForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): boolean {
	if (role !== "ENP") return false
	return isKycNotStartedOrPending(kycStatus)
}

export function assertBookerCanBookLawyerForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): void {
	if (!isLawyerBookingBlockedForKyc(role, kycStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message:
			"Complete identity verification before booking an Electronic Notary Public. You can finish this from Profile or Onboarding.",
	})
}

export function assertEnpCanCreateMeetingForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): void {
	if (!isEnpMeetingCreationBlockedForKyc(role, kycStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message:
			"Complete identity verification before creating a meeting. You can finish this from Profile or Onboarding.",
	})
}
