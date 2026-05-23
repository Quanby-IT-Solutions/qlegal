import { and, eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"

import { env } from "@/env"

/** Latest timestamp in `values` (skips null/undefined). Returns null if no candidate provided. */
function maxDate(...values: Array<Date | null | undefined>): Date | null {
	let latest: Date | null = null
	for (const value of values) {
		if (!value) continue
		if (!latest || value.getTime() > latest.getTime()) {
			latest = value
		}
	}
	return latest
}

/**
 * If the user's KYC verification is older than `KYC_VERIFICATION_VALIDITY_DAYS`, reset them to
 * require a new HyperVerge flow and mark local ID rows as no longer verified (HyperVerge purges
 * vendor-side results on a similar window).
 *
 * Self-heals when `users.kyc_verified_at` is stale or null but a recent verified `kyc_sessions`
 * row exists — repairs the user row instead of expiring it. This avoids wrongly resetting users
 * to NOT_STARTED on every page reload when the user-row timestamp got out of sync.
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

		// Pull the most recent verified KYC session as a secondary source of truth. The user-row
		// timestamp can drift (e.g. updated by a code path that didn't refresh `kyc_verified_at`),
		// but the session row records the actual verification moment.
		const latestVerifiedSession = await db.query.kycSessions.findFirst({
			where: and(eq(kycSessions.userId, userId), eq(kycSessions.status, "VERIFIED")),
			orderBy: (table, { desc }) => [desc(table.verifiedAt), desc(table.updatedAt)],
			columns: {
				verifiedAt: true,
				updatedAt: true,
			},
		})

		const effectiveVerifiedAt = maxDate(
			user.kycVerifiedAt,
			latestVerifiedSession?.verifiedAt,
			latestVerifiedSession?.updatedAt
		)

		const validityMs = env.KYC_VERIFICATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000

		// No timestamp anywhere → cannot prove freshness, but don't wipe a VERIFIED row just because
		// the timestamp is missing. Leave as-is and let the next successful KYC write repair it.
		if (!effectiveVerifiedAt) {
			return false
		}

		const ageMs = Date.now() - effectiveVerifiedAt.getTime()
		if (ageMs < validityMs) {
			// Fresh according to at least one source. If the user row is stale (older than the
			// session's verifiedAt, or null), self-heal so the next reload doesn't repeat this work.
			const userTs = user.kycVerifiedAt?.getTime() ?? 0
			if (userTs < effectiveVerifiedAt.getTime()) {
				await db
					.update(users)
					.set({ kycVerifiedAt: effectiveVerifiedAt, kycLastExpiredAt: null })
					.where(eq(users.id, userId))
			}
			return false
		}

		console.warn("[expireUserKycIfNeeded] Expiring KYC", {
			userId,
			userVerifiedAt: user.kycVerifiedAt,
			sessionVerifiedAt: latestVerifiedSession?.verifiedAt,
			effectiveVerifiedAt,
			ageDays: Math.round(ageMs / (24 * 60 * 60 * 1000)),
		})

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
