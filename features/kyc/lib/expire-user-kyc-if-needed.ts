import { and, eq, isNotNull } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"

import { env } from "@/env"

const MIN_KYC_VERIFICATION_VALIDITY_DAYS = 14

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
				kycLastExpiredAt: true,
			},
		})

		if (!user) {
			return false
		}

		// SENTINEL_v2_BULLETPROOF_GUARD: log presence to verify deployed code on Cloud Run.
		// Bulletproof short-circuit: if the user row itself says VERIFIED with a recent
		// kycVerifiedAt, do absolutely nothing. This protects against any unexpected drift
		// in kyc_sessions reconciliation logic below.
		const validityDaysEarly = Math.max(
			env.KYC_VERIFICATION_VALIDITY_DAYS,
			MIN_KYC_VERIFICATION_VALIDITY_DAYS
		)
		const validityMsEarly = validityDaysEarly * 24 * 60 * 60 * 1000
		if (
			user.kycStatus === "VERIFIED" &&
			user.kycVerifiedAt &&
			Date.now() - user.kycVerifiedAt.getTime() < validityMsEarly
		) {
			console.warn("[expireUserKycIfNeeded] SENTINEL_v2 short-circuit (user row authoritative)", {
				userId,
				kycVerifiedAt: user.kycVerifiedAt,
				ageMs: Date.now() - user.kycVerifiedAt.getTime(),
				validityMs: validityMsEarly,
			})
			if (user.kycLastExpiredAt) {
				await db
					.update(users)
					.set({ kycLastExpiredAt: null })
					.where(eq(users.id, userId))
			}
			return false
		}

		const latestSession = await db.query.kycSessions.findFirst({
			where: eq(kycSessions.userId, userId),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
			columns: {
				id: true,
				status: true,
				createdAt: true,
			},
		})

		const latestVerifiedSessionWithTimestamp = await db.query.kycSessions.findFirst({
			where: and(
				eq(kycSessions.userId, userId),
				eq(kycSessions.status, "VERIFIED"),
				isNotNull(kycSessions.verifiedAt)
			),
			orderBy: (table, { desc }) => [desc(table.verifiedAt)],
			columns: {
				id: true,
				verifiedAt: true,
				updatedAt: true,
				createdAt: true,
			},
		})
		const latestVerifiedSession =
			latestVerifiedSessionWithTimestamp ??
			(await db.query.kycSessions.findFirst({
				where: and(eq(kycSessions.userId, userId), eq(kycSessions.status, "VERIFIED")),
				orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.createdAt)],
				columns: {
					id: true,
					verifiedAt: true,
					updatedAt: true,
					createdAt: true,
				},
			}))

		const effectiveVerifiedAt =
			latestVerifiedSession?.verifiedAt ??
			latestVerifiedSession?.updatedAt ??
			latestVerifiedSession?.createdAt ??
			user.kycVerifiedAt ??
			null

		if (!latestVerifiedSession || !effectiveVerifiedAt) {
			if (user.kycLastExpiredAt) {
				await db
					.update(users)
					.set({
						kycLastExpiredAt: null,
					})
					.where(eq(users.id, userId))
			}
			return false
		}

		const validityDays = Math.max(
			env.KYC_VERIFICATION_VALIDITY_DAYS,
			MIN_KYC_VERIFICATION_VALIDITY_DAYS
		)
		const validityMs = validityDays * 24 * 60 * 60 * 1000
		const ageMs = Date.now() - effectiveVerifiedAt.getTime()
		if (ageMs < validityMs || ageMs < 0) {
			await db
				.update(users)
				.set({
					kycStatus: "VERIFIED",
					kycVerifiedAt: effectiveVerifiedAt,
					kycLastExpiredAt: null,
				})
				.where(eq(users.id, userId))

			if (!latestVerifiedSession.verifiedAt) {
				await db
					.update(kycSessions)
					.set({
						verifiedAt: effectiveVerifiedAt,
						updatedAt: new Date(),
					})
					.where(eq(kycSessions.id, latestVerifiedSession.id))
			}

			return false
		}

		if (
			latestSession &&
			latestSession.id !== latestVerifiedSession.id &&
			latestSession.status !== "NOT_STARTED" &&
			latestSession.createdAt.getTime() > effectiveVerifiedAt.getTime()
		) {
			await db
				.update(users)
				.set({
					kycStatus: latestSession.status,
					kycVerifiedAt: null,
					kycLastExpiredAt: null,
				})
				.where(eq(users.id, userId))
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

		// Defensive guard: re-query the DB (source of truth) for any recent VERIFIED session
		// before flipping the user to NOT_STARTED. If a verified session within the validity
		// window still exists, self-heal to VERIFIED instead of expiring. Prevents accidental
		// resets if in-memory state (effectiveVerifiedAt / ageMs / validityMs) ever drifts.
		const guardCutoff = new Date(Date.now() - validityMs)
		const recentVerifiedRow = await db.query.kycSessions.findFirst({
			where: and(
				eq(kycSessions.userId, userId),
				eq(kycSessions.status, "VERIFIED"),
				isNotNull(kycSessions.verifiedAt)
			),
			orderBy: (table, { desc }) => [desc(table.verifiedAt)],
			columns: { id: true, verifiedAt: true },
		})
		if (
			recentVerifiedRow?.verifiedAt &&
			recentVerifiedRow.verifiedAt.getTime() >= guardCutoff.getTime()
		) {
			console.warn("[expireUserKycIfNeeded] Abort expire — recent VERIFIED session exists", {
				userId,
				sessionId: recentVerifiedRow.id,
				sessionVerifiedAt: recentVerifiedRow.verifiedAt,
				guardCutoff,
				validityDays,
			})
			await db
				.update(users)
				.set({
					kycStatus: "VERIFIED",
					kycVerifiedAt: recentVerifiedRow.verifiedAt,
					kycLastExpiredAt: null,
				})
				.where(eq(users.id, userId))
			return false
		}

		console.warn("[expireUserKycIfNeeded] Expiring KYC", {
			userId,
			userVerifiedAt: user.kycVerifiedAt,
			sessionVerifiedAt: latestVerifiedSession?.verifiedAt,
			effectiveVerifiedAt,
			ageDays: Math.round(ageMs / (24 * 60 * 60 * 1000)),
			validityDays,
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
