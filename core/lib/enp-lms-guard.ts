import { TRPCError } from "@trpc/server"

/**
 * ENPs with role but pending/suspended commission cannot run sessions or notary scheduling.
 * Step 2 sets role ENP + PENDING; admin "Approve" sets commission ACTIVE (stand-in for step 5 / SC).
 */
export const ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE =
	"Sessions and booking are turned on when your commission is Active. A QLegal administrator activates it after accreditation (step 5)—finishing all five LMS module checkboxes in the course page is not what unlocks meetings."

export function isEnpCommissionInactiveForRestrictedOps(
	role: string | null | undefined,
	commissionStatus: string | null | undefined
): boolean {
	if ((role ?? "").trim().toUpperCase() !== "ENP") return false
	return (commissionStatus ?? "").trim().toUpperCase() !== "ACTIVE"
}

export function assertEnpCommissionActiveForRestrictedOps(
	role: string | null | undefined,
	commissionStatus: string | null | undefined
): void {
	if (!isEnpCommissionInactiveForRestrictedOps(role, commissionStatus)) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE,
	})
}
