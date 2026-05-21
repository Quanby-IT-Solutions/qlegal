import { and, eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"

import { env } from "@/env"

/**
 * If the user's KYC verification is older than `KYC_VERIFICATION_VALIDITY_DAYS`, reset them to
 * require a new HyperVerge flow and mark local ID rows as no longer verified (HyperVerge purges
 * vendor-side results on a similar window).
 *
 * Idempotent: repeated calls after expiry are no-ops.
 *
 * Called from NextAuth `session` / `jwt` callbacks and `getUserKycInfo` so JWT and DB stay aligned
 * when the token is refreshed; middleware still relies on JWT until the next refresh.
 *
 * @returns true if an expiry update was applied this call
 */
export async function expireUserKycIfNeeded(userId: string): Promise<boolean> {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				kycStatus: true,
				kycVerifiedAt: true,
			},
		})

		if (user?.kycStatus !== "VERIFIED" || !user?.kycVerifiedAt) {
			return false
		}

		const validityMs = env.KYC_VERIFICATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
		const ageMs = Date.now() - user.kycVerifiedAt.getTime()
		if (ageMs < validityMs) {
			return false
		}

		await db
			.update(users)
			.set({
				kycStatus: "NOT_STARTED",
				kycVerifiedAt: null,
				kycLastExpiredAt: new Date(),
			})
			.where(eq(users.id, userId))

		await db
			.update(idCardDetails)
			.set({
				isVerified: false,
				verifiedAt: null,
				updatedAt: new Date(),
			})
			.where(and(eq(idCardDetails.userId, userId), eq(idCardDetails.isVerified, true)))

		return true
	} catch (error) {
		console.error("[expireUserKycIfNeeded] Failed:", error)
		return false
	}
}
