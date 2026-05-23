/**
 * Inspect / restore KYC state for verifying the syncUserKycStatusFromLatestSession fix.
 * Run:
 *   pnpm exec tsx scripts/inspect-kyc-state.ts                                  # inspect only
 *   pnpm exec tsx scripts/inspect-kyc-state.ts --restore                        # set users.kycStatus=VERIFIED + kycVerifiedAt to simulate "verified but kyc_sessions missing VERIFIED row" state
 *   pnpm exec tsx scripts/inspect-kyc-state.ts --clear-self-heal                # delete previously inserted self_heal rows so we can re-test
 */
import "dotenv/config"

import { and, desc, eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"

const USER_ID = "e09dec8f-8149-4c6d-a7b9-3b3f596e143e"

async function main() {
	const args = new Set(process.argv.slice(2))

	const user = await db.query.users.findFirst({
		where: eq(users.id, USER_ID),
		columns: {
			id: true,
			email: true,
			kycStatus: true,
			kycVerifiedAt: true,
			kycLastExpiredAt: true,
		},
	})

	const sessions = await db.query.kycSessions.findMany({
		where: eq(kycSessions.userId, USER_ID),
		orderBy: [desc(kycSessions.createdAt)],
		columns: {
			id: true,
			sessionType: true,
			status: true,
			transactionId: true,
			verifiedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	console.log("\n=== USER ===")
	console.log(JSON.stringify(user, null, 2))
	console.log("\n=== KYC_SESSIONS (newest first) ===")
	console.log(JSON.stringify(sessions, null, 2))

	if (args.has("--clear-self-heal")) {
		const result = await db
			.delete(kycSessions)
			.where(and(eq(kycSessions.userId, USER_ID), eq(kycSessions.sessionType, "self_heal")))
			.returning({ id: kycSessions.id, transactionId: kycSessions.transactionId })
		console.log("\n🧹 Deleted self_heal rows:", result)
	}

	if (args.has("--restore")) {
		const verifiedAt = new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago, well within validity
		const updated = await db
			.update(users)
			.set({
				kycStatus: "VERIFIED",
				kycVerifiedAt: verifiedAt,
				kycLastExpiredAt: null,
			})
			.where(eq(users.id, USER_ID))
			.returning({
				id: users.id,
				kycStatus: users.kycStatus,
				kycVerifiedAt: users.kycVerifiedAt,
				kycLastExpiredAt: users.kycLastExpiredAt,
			})

		// Also delete any prior self_heal rows so the next /profile reload triggers the self-heal path freshly.
		await db
			.delete(kycSessions)
			.where(and(eq(kycSessions.userId, USER_ID), eq(kycSessions.sessionType, "self_heal")))

		console.log("\n✅ Restored to VERIFIED (no VERIFIED kyc_sessions row):", updated)
	}

	process.exit(0)
}

void main().catch(error => {
	console.error("❌", error)
	process.exit(1)
})
