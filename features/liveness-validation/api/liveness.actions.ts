"use server"

import { revalidatePath } from "next/cache"

import {
	checkLiveness,
	isDirectLivenessEnabled,
	type LivenessDecisionResult,
} from "@/services/hyperverge/liveness"
import { auth } from "@/services/next-auth"

/**
 * Generate a unique transaction ID for liveness validation
 */
function generateTransactionId(userId: string): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `liveness_${userId}_${timestamp}_${random}`.toUpperCase()
}

/**
 * Get the current liveness mode configuration
 * Returns whether direct API mode is enabled (feature flag)
 */
export async function getLivenessMode() {
	return {
		success: true,
		data: {
			isDirectMode: isDirectLivenessEnabled,
			mode: isDirectLivenessEnabled ? "direct" : "hosted",
			description: isDirectLivenessEnabled
				? "Direct selfie capture mode - capture selfie in-app and validate via API"
				: "Hosted workflow mode - redirect to HyperVerge hosted verification page",
		},
	}
}

/**
 * Validate selfie liveness using direct API mode
 * This is behind a feature flag (HYPERVERGE_DIRECT_LIVENESS_ENABLED)
 *
 * Uses the unified decision logic with liveFace.value and summary.action
 *
 * @param imageBase64 - Base64 encoded selfie image (with or without data URI prefix)
 */
export async function validateSelfieLiveness(imageBase64: string) {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	// Check if direct liveness mode is enabled
	if (!isDirectLivenessEnabled) {
		return {
			success: false,
			error: "Direct liveness mode is not enabled. Please use the hosted verification flow.",
		}
	}

	// Validate image data
	if (!imageBase64 || imageBase64.length < 100) {
		return {
			success: false,
			error: "Invalid image data provided",
		}
	}

	const transactionId = generateTransactionId(session.user.id)

	console.log("🔵 Starting direct liveness validation...")
	console.log("   - User:", session.user.email)
	console.log("   - Transaction ID:", transactionId)

	try {
		// Call HyperVerge /checkLiveness API
		const result = await checkLiveness({
			image: imageBase64,
			transactionId,
		})

		const decision = result.decision

		if (!decision) {
			throw new Error("No decision returned from liveness check")
		}

		console.log("📊 Liveness Decision:", {
			liveFaceValue: decision.liveFaceValue,
			summaryAction: decision.summaryAction,
			isApproved: decision.isApproved,
			qualityIssues: decision.qualityIssues,
		})

		revalidatePath("/liveness")

		return {
			success: true,
			data: {
				transactionId,
				status: decision.isApproved ? "VERIFIED" : "REJECTED",
				decision: {
					isLive: decision.isLive,
					actionPassed: decision.actionPassed,
					isApproved: decision.isApproved,
					message: decision.message,
					qualityIssues: decision.qualityIssues,
					liveFaceValue: decision.liveFaceValue,
					summaryAction: decision.summaryAction,
				} as LivenessDecisionResult,
				metadata: result.metadata,
			},
		}
	} catch (error) {
		console.error("Failed to validate selfie liveness:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to validate selfie liveness",
		}
	}
}
