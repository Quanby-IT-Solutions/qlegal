"use server"

import { db } from "@/services/drizzle/db"
import { livenessValidations } from "@/services/drizzle/schema/liveness"
import { eq, desc } from "drizzle-orm"

/**
 * Save liveness validation attempt to database
 */
export async function saveLivenessValidation(data: {
	userId: string
	transactionId: string
	attemptNumber: number
	status: "pass" | "fail"
	errorMessage?: string
}) {
	try {
		const validation = await db.insert(livenessValidations).values({
			userId: data.userId,
			transactionId: data.transactionId,
			attemptNumber: data.attemptNumber,
			status: data.status,
			errorMessage: data.errorMessage || null,
		}).returning()

		return {
			success: true,
			data: validation[0],
		}
	} catch (error) {
		console.error("Failed to save liveness validation:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to save validation",
		}
	}
}

/**
 * Get user's liveness validation attempts
 */
export async function getUserLivenessAttempts(userId: string) {
	try {
		const attempts = await db
			.select()
			.from(livenessValidations)
			.where(eq(livenessValidations.userId, userId))
			.orderBy(desc(livenessValidations.createdAt))
			.limit(10)

		return {
			success: true,
			data: attempts,
		}
	} catch (error) {
		console.error("Failed to get liveness attempts:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get attempts",
		}
	}
}

/**
 * Get latest successful validation for user
 */
export async function getLatestSuccessfulValidation(userId: string) {
	try {
		const validation = await db
			.select()
			.from(livenessValidations)
			.where(
				eq(livenessValidations.userId, userId)
			)
			.orderBy(desc(livenessValidations.createdAt))
			.limit(1)

		return {
			success: true,
			data: validation[0] || null,
		}
	} catch (error) {
		console.error("Failed to get latest validation:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get validation",
		}
	}
}

/**
 * Count user's attempts today
 */
export async function countTodayAttempts(userId: string) {
	try {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const attempts = await db
			.select()
			.from(livenessValidations)
			.where(eq(livenessValidations.userId, userId))

		const todayAttempts = attempts.filter(
			a => a.createdAt && a.createdAt >= today
		)

		return {
			success: true,
			count: todayAttempts.length,
		}
	} catch (error) {
		console.error("Failed to count attempts:", error)
		return {
			success: false,
			count: 0,
		}
	}
}
