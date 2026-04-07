import { TRPCError } from "@trpc/server"

/**
 * KYC states that block restricted flows until identity verification succeeds.
 * Includes not started, in review (pending), and rejected (user must re-verify).
 */
export function isKycVerificationBlocking(kycStatus: string | null | undefined): boolean {
	const status = kycStatus ?? "NOT_STARTED"
	return status === "NOT_STARTED" || status === "PENDING" || status === "REJECTED"
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
	return isKycVerificationBlocking(kycStatus)
}

/**
 * ENP users must finish identity verification before creating a meeting (ad-hoc session flow).
 */
export function isEnpMeetingCreationBlockedForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): boolean {
	if (role !== "ENP") return false
	return isKycVerificationBlocking(kycStatus)
}

/** tRPC message for ENP/Principal KYC blocks when booking an ENP. */
export const KYC_ENP_BOOKING_TRPC_MESSAGE =
	"Complete identity verification before booking an Electronic Notary Public. You can finish this from Profile or Onboarding."

export function assertBookerCanBookLawyerForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): void {
	if (!isLawyerBookingBlockedForKyc(role, kycStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: KYC_ENP_BOOKING_TRPC_MESSAGE,
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

/** tRPC message when ENP/Principal cannot join a video session (token, link join, accept invite). */
export const KYC_ENP_PRINCIPAL_SESSION_JOIN_MESSAGE =
	"Complete identity verification before joining a session. You can finish verification from Profile or when prompted in the app."

/**
 * ENP and Principal must finish identity verification before joining a video session
 * (same KYC rule as booking an ENP from browse — see {@link isLawyerBookingBlockedForKyc}).
 */
export function assertEnpOrPrincipalCanJoinSessionForKyc(
	role: string | null | undefined,
	kycStatus: string | null | undefined
): void {
	if (!isLawyerBookingBlockedForKyc(role, kycStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: KYC_ENP_PRINCIPAL_SESSION_JOIN_MESSAGE,
	})
}
