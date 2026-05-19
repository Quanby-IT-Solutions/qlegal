import "server-only"

import { TRPCError } from "@trpc/server"

import { ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE } from "@/core/lib/enp-lms-guard"

import { syncEnpCommissionStatusFromSupremeCourt } from "@/services/supreme-court/lib/sync-enp-commission"

/**
 * Async variant: Sync ENP commission status from Supreme Court before checking if inactive.
 * Ensures real-time verification - if SC has revoked a commission, user is blocked immediately.
 *
 * @param userId - User ID of the ENP
 * @param role - User's role
 * @returns true if ENP with inactive/suspended commission, false otherwise
 */
export async function isEnpCommissionInactiveForRestrictedOpsWithSync(
	userId: string,
	role: string | null | undefined
): Promise<boolean> {
	if ((role ?? "").trim().toUpperCase() !== "ENP") return false

	const synced = await syncEnpCommissionStatusFromSupremeCourt(userId)
	return synced.trim().toUpperCase() !== "ACTIVE"
}

/**
 * Async variant: Assert ENP commission is active, with sync from Supreme Court.
 * Non-blocking: If sync fails, falls back to DB value.
 *
 * @param userId - User ID of the ENP
 * @param role - User's role
 * @throws TRPCError with FORBIDDEN if commission is not active
 */
export async function assertEnpCommissionActiveForRestrictedOpsWithSync(
	userId: string,
	role: string | null | undefined
): Promise<void> {
	if (!(await isEnpCommissionInactiveForRestrictedOpsWithSync(userId, role))) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE,
	})
}
