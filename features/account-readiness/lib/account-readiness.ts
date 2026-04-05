import { and, eq, gt } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import type { schema } from "@/services/drizzle/schema"
import { users } from "@/services/drizzle/schema/auth"
import { savedIds } from "@/services/drizzle/schema/saved-ids"

type DB = PostgresJsDatabase<typeof schema>

export interface AccountReadiness {
	canBrowse: boolean
	hasValidSavedId: boolean
	canBook: boolean
	canAppearInBrowse: boolean
	canStartNotarization: boolean
	canJoinMeeting: boolean
	reasons: string[]
}

/**
 * Returns the readiness state for a given user.
 * All capability checks are derived from a single DB round-trip per concern.
 */
export async function getAccountReadiness(userId: string, db: DB): Promise<AccountReadiness> {
	const [user, validSavedId] = await Promise.all([
		db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { role: true, commissionStatus: true },
		}),
		db.query.savedIds.findFirst({
			where: and(
				eq(savedIds.userId, userId),
				eq(savedIds.isActive, true),
				eq(savedIds.isExpired, false),
				gt(savedIds.expiresAt, new Date())
			),
			columns: { id: true },
		}),
	])

	const reasons: string[] = []

	const hasValidSavedId = validSavedId !== undefined

	if (!hasValidSavedId) {
		reasons.push("NO_VALID_SAVED_ID")
	}

	const isCommissionActive = user?.commissionStatus === "ACTIVE"

	if (!isCommissionActive) {
		reasons.push("COMMISSION_NOT_ACTIVE")
	}

	return {
		canBrowse: true,
		hasValidSavedId,
		canBook: hasValidSavedId,
		canAppearInBrowse: isCommissionActive && hasValidSavedId,
		canStartNotarization: isCommissionActive && hasValidSavedId,
		canJoinMeeting: hasValidSavedId,
		reasons,
	}
}
