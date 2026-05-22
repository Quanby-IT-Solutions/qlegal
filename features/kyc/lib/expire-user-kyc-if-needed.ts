import { and, eq } from "drizzle-orm"

import { env } from "@/env"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"

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

		if (user?.kycStatus !== "VERIFIED") {
			return false
		}

		const latestVerifiedSession = await db.query.kycSessions.findFirst({
			where: and(eq(kycSessions.userId, userId), eq(kycSessions.status, "VERIFIED")),
			orderBy: (table, { desc }) => [desc(table.verifiedAt), desc(table.updatedAt)],
			columns: {
				verifiedAt: true,
				updatedAt: true,
				createdAt: true,
			},
		})

		const effectiveVerifiedAt =
			latestVerifiedSession?.verifiedAt ??
			latestVerifiedSession?.updatedAt ??
			latestVerifiedSession?.createdAt ??
			user.kycVerifiedAt

		if (!effectiveVerifiedAt) {
			return false
		}

		if (
			!user.kycVerifiedAt ||
			latestVerifiedSession?.verifiedAt?.getTime() !== user.kycVerifiedAt.getTime()
		) {
			await db
				.update(users)
				.set({
					kycVerifiedAt: effectiveVerifiedAt,
					kycLastExpiredAt: null,
				})
				.where(eq(users.id, userId))
		}

		const validityMs = env.KYC_VERIFICATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
		const ageMs = Date.now() - effectiveVerifiedAt.getTime()
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
