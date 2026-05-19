import { eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { getCommissionStatus } from "@/services/supreme-court/api/commission-status"

/**
 * Sync lawyer's commission status from Supreme Court API and update database.
 *
 * Maps Supreme Court "Active"/"Inactive" to our enum "ACTIVE"/"SUSPENDED".
 * Non-blocking: if API fails, logs warning and returns current DB value.
 *
 * @param userId - User ID of the ENP (lawyer)
 * @returns Latest commission status ("ACTIVE", "SUSPENDED", or "PENDING")
 */
export async function syncEnpCommissionStatusFromSupremeCourt(userId: string): Promise<string> {
	try {
		// Retrieve user's ENP profile to get NPN (and rollNo for API contract compliance)
		const enpProfile = await db.query.enpProfiles.findFirst({
			where: (data, { eq }) => eq(data.userId, userId),
			columns: {
				notaryPublicNumber: true,
				rollNo: true,
			},
		})

		if (!enpProfile) {
			console.warn(`[syncEnpCommissionStatus] ENP profile not found for userId: ${userId}`)
			// Return current DB value if profile doesn't exist
			const user = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.id, userId),
				columns: { commissionStatus: true },
			})
			return (user?.commissionStatus ?? "PENDING") as string
		}

		const npn = enpProfile.notaryPublicNumber

		// NPN is required for Supreme Court lookup
		if (!npn) {
			console.warn(`[syncEnpCommissionStatus] Missing NPN for userId: ${userId}`)
			// Return current DB value if NPN is not set
			const user = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.id, userId),
				columns: { commissionStatus: true },
			})
			return (user?.commissionStatus ?? "PENDING") as string
		}

		// Format rn for API contract compliance — SC requires the field but ignores its value
		const rn = enpProfile.rollNo ? `RN-${enpProfile.rollNo}` : "RN-0"

		// Call Supreme Court API to get latest commission status (SC only uses NPN)
		const scResponse = await getCommissionStatus(npn, rn)

		// Map Supreme Court response to our enum values
		// "Active" (from SC) → "ACTIVE" (our enum)
		// "Inactive" (from SC) → "SUSPENDED" (our enum)
		const scStatus = scResponse.commissionStatus ?? ""
		const newCommissionStatus = scStatus.toLowerCase() === "active" ? "ACTIVE" : "SUSPENDED"

		// Update database with synced status
		await db
			.update(users)
			.set({
				commissionStatus: newCommissionStatus,
			})
			.where(eq(users.id, userId))

		console.log(
			`[syncEnpCommissionStatus] Updated userId: ${userId} to ${newCommissionStatus} (from SC: ${scStatus})`
		)

		return newCommissionStatus
	} catch (error) {
		// Log error but don't throw - this is non-blocking
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.warn(
			`[syncEnpCommissionStatus] Failed to sync from Supreme Court for userId: ${userId}. Error: ${errorMessage}`
		)

		// Fallback to current DB value on failure
		const user = await db.query.users.findFirst({
			where: (data, { eq }) => eq(data.id, userId),
			columns: { commissionStatus: true },
		})

		const currentStatus = (user?.commissionStatus ?? "PENDING") as string
		console.log(
			`[syncEnpCommissionStatus] Falling back to DB value for userId: ${userId}: ${currentStatus}`
		)

		return currentStatus
	}
}
