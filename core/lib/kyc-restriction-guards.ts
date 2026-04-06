import { TRPCError } from "@trpc/server"

/** Shared: KYC not yet complete for flows that require verification. */
export function isKycNotStartedOrPending(kycStatus: string | null | undefined): boolean {
	const status = kycStatus ?? "NOT_STARTED"
	return status === "NOT_STARTED" || status === "PENDING"
}

/**
 * ENP and Principal users must finish identity verification before booking or
 * messaging an Electronic Notary Public (browse, messages, etc.).
 */
export function isLawyerContactBlockedForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): boolean {
	if (role !== "ENP" && role !== "PRINCIPAL") return false
	return isKycNotStartedOrPending(kycStatus)
}

/** @see isLawyerContactBlockedForKyc */
export const isLawyerBookingBlockedForKyc = isLawyerContactBlockedForKyc
/** @see isLawyerContactBlockedForKyc */
export const isLawyerMessagingBlockedForKyc = isLawyerContactBlockedForKyc

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

/** tRPC message for ENP/Principal KYC blocks (booking + messaging ENPs). Client may match on this. */
export const KYC_ENP_LAWYER_CONTACT_TRPC_MESSAGE =
	"Complete identity verification before booking or messaging an Electronic Notary Public. You can finish this from Profile or Onboarding."

export function assertBookerCanBookLawyerForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): void {
	if (!isLawyerContactBlockedForKyc(role, kycStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: KYC_ENP_LAWYER_CONTACT_TRPC_MESSAGE,
	})
}

/** Same rule as booking an ENP: use when starting a DM with an ENP. */
export const assertBookerCanMessageLawyerForKyc = assertBookerCanBookLawyerForKyc

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
