"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getUrl } from "@/core/lib/get-url"

import { db } from "@/services/drizzle/db"
import { livenessValidations } from "@/services/drizzle/schema/liveness"
import { users } from "@/services/drizzle/schema/auth"
import {
	checkLiveness,
	getWorkflowOutput,
	isDirectLivenessEnabled,
	startHostedWorkflow,
	type LivenessDecisionResult,
} from "@/services/hyperverge/liveness"
import { matchFaceSelfieToId } from "@/services/hyperverge/kyc-direct"
import {
	fetchImageUrlAsDataUrl,
	getHyperVergeKycLogs,
	pickBestFaceImageUrlFromLogs,
} from "@/services/hyperverge/kyc-logs"
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
 * @param meetingId - Optional meeting ID to associate this verification with
 */
export async function validateSelfieLiveness(imageBase64: string, meetingId?: string) {
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
	console.log("   - Meeting ID:", meetingId ?? "N/A")

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

		// Optional: Face match meeting selfie vs KYC reference (if available)
		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
			columns: {
				kycStatus: true,
				kycReferenceIdImageBase64: true,
				kycTransactionId: true,
			},
		})

		let referenceImageBase64 = user?.kycReferenceIdImageBase64 ?? null

		// If KYC is verified but reference image is missing (common for onboarding link),
		// fetch Logs API once and store a face reference for later checks.
		if (user?.kycStatus === "VERIFIED" && !referenceImageBase64 && user.kycTransactionId) {
			try {
				const logs = await getHyperVergeKycLogs({ transactionId: user.kycTransactionId })
				const url = pickBestFaceImageUrlFromLogs(logs)
				if (url) {
					const dataUrl = await fetchImageUrlAsDataUrl(url)
					if (dataUrl) {
						referenceImageBase64 = dataUrl
						await db
							.update(users)
							.set({
								kycReferenceIdImageBase64: dataUrl,
								kycReferenceCreatedAt: new Date(),
							})
							.where(eq(users.id, session.user.id))
					}
				}
			} catch (e) {
				console.warn("⚠️ Failed to populate KYC reference image from Logs API:", e)
			}
		}

		let faceMatchPassed = true
		let faceMatchMeta:
			| {
					matchValue: "yes" | "no" | "unknown"
					summaryAction: "pass" | "fail" | "manualReview" | "unknown"
			  }
			| null = null

		if (user?.kycStatus === "VERIFIED" && referenceImageBase64) {
			const faceMatch = await matchFaceSelfieToId({
				transactionId,
				selfieBase64: imageBase64,
				idBase64: referenceImageBase64,
				returnScore: true,
			})

			faceMatchMeta = {
				matchValue: faceMatch.matchValue,
				summaryAction: faceMatch.summaryAction,
			}
			faceMatchPassed = faceMatch.matchValue === "yes" && faceMatch.summaryAction === "pass"
		}

		const finalApproved = decision.isApproved && faceMatchPassed
		const finalDecision: LivenessDecisionResult = finalApproved
			? {
					...decision,
					isApproved: true,
					message: "Liveness and face match verified successfully.",
			  }
			: faceMatchPassed
				? {
						...decision,
						isApproved: false,
				  }
				: {
						...decision,
						isApproved: false,
						message: "Face match failed. Please retake your selfie and try again.",
				  }

		console.log("📊 Liveness Decision:", {
			liveFaceValue: decision.liveFaceValue,
			summaryAction: decision.summaryAction,
			isApproved: decision.isApproved,
			qualityIssues: decision.qualityIssues,
			faceMatchPassed,
		})

		// Save to database
		try {
			await db.insert(livenessValidations).values({
				userId: session.user.id,
				meetingId: meetingId ?? null,
				transactionId,
				status: finalDecision.isApproved ? "pass" : "fail",
				errorMessage: finalDecision.isApproved ? null : finalDecision.message,
				attemptNumber: 1,
			})
			console.log(
				"✅ Saved liveness validation to database",
				meetingId ? `for meeting ${meetingId}` : ""
			)
		} catch (dbError) {
			console.error("⚠️ Failed to save to database (non-critical):", dbError)
			// Don't fail the whole operation if database save fails
		}

		revalidatePath("/liveness")

		return {
			success: true,
			data: {
				transactionId,
				status: finalDecision.isApproved ? "VERIFIED" : "REJECTED",
				decision: {
					isLive: finalDecision.isLive,
					actionPassed: finalDecision.actionPassed,
					isApproved: finalDecision.isApproved,
					message: finalDecision.message,
					qualityIssues: finalDecision.qualityIssues,
					liveFaceValue: finalDecision.liveFaceValue,
					summaryAction: finalDecision.summaryAction,
				} as LivenessDecisionResult,
				metadata: {
					...result.metadata,
					faceMatch: faceMatchMeta,
				},
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

/**
 * Start hosted liveness workflow
 * This initiates HyperVerge's hosted verification page
 * User will be redirected to HyperVerge, complete verification, then redirected back
 *
 * @param redirectAfterSuccess - Optional URL to redirect to after successful verification
 * @param meetingId - Optional meeting ID to associate this verification with
 * @returns Redirect URL to HyperVerge hosted page
 */
export async function startHostedLivenessWorkflow(
	redirectAfterSuccess?: string,
	meetingId?: string
) {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const transactionId = generateTransactionId(session.user.id)
	const baseUrl = getUrl()
	let callbackUrl = `${baseUrl}/liveness/callback?transactionId=${transactionId}`
	if (redirectAfterSuccess) {
		callbackUrl += `&redirect=${encodeURIComponent(redirectAfterSuccess)}`
	}
	if (meetingId) {
		callbackUrl += `&meetingId=${encodeURIComponent(meetingId)}`
	}

	console.log("🔵 Starting hosted liveness workflow...")
	console.log("   - User:", session.user.email)
	console.log("   - Transaction ID:", transactionId)
	console.log("   - Meeting ID:", meetingId ?? "N/A")
	console.log("   - Callback URL:", callbackUrl)

	try {
		const result = await startHostedWorkflow({
			workflowId: "workflow_liveness",
			transactionId,
			redirectUrl: callbackUrl,
		})

		console.log("✅ Hosted workflow started successfully")
		console.log("   - Start URL:", result.result.startKycUrl)

		return {
			success: true,
			data: {
				redirectUrl: result.result.startKycUrl,
				transactionId,
			},
		}
	} catch (error) {
		console.error("Failed to start hosted liveness workflow:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to start hosted workflow",
		}
	}
}

/**
 * Check if the current user has completed liveness verification for a specific meeting
 * @param meetingId - The meeting ID to check verification for
 */
export async function checkUserLivenessStatus(meetingId?: string) {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	try {
		const { eq, and } = await import("drizzle-orm")

		// Check if user has a successful liveness validation for this specific meeting
		const validation = await db.query.livenessValidations.findFirst({
			where: and(
				eq(livenessValidations.userId, session.user.id),
				eq(livenessValidations.meetingId, meetingId ?? ""),
				eq(livenessValidations.status, "pass")
			),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
		})

		return {
			success: true,
			data: {
				isVerified: !!validation,
				verifiedAt: validation?.createdAt,
				transactionId: validation?.transactionId,
				meetingId: (validation?.meetingId ?? null) as string | null,
			},
		}
	} catch (error) {
		console.error("Failed to check liveness status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to check liveness status",
		}
	}
}

/**
 * Get liveness verification results from completed hosted workflow
 * This should be called ONCE after user completes verification and is redirected back
 *
 * @param transactionId - The transaction ID from the hosted workflow
 * @param meetingId - Optional meeting ID to associate this verification with
 */
export async function getHostedLivenessResult(transactionId: string, meetingId?: string) {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	if (!transactionId) {
		return {
			success: false,
			error: "Transaction ID is required",
		}
	}

	console.log("🔵 Fetching hosted liveness results...")
	console.log("   - User:", session.user.email)
	console.log("   - Transaction ID:", transactionId)
	console.log("   - Meeting ID:", meetingId ?? "N/A")

	try {
		const result = await getWorkflowOutput(transactionId)

		const decision = result.decision

		if (!decision) {
			throw new Error("No decision returned from workflow output")
		}

		console.log("📊 Liveness Decision:", {
			liveFaceValue: decision.liveFaceValue,
			summaryAction: decision.summaryAction,
			isApproved: decision.isApproved,
			qualityIssues: decision.qualityIssues,
		})

		// Save to database
		try {
			await db.insert(livenessValidations).values({
				userId: session.user.id,
				meetingId: meetingId ?? null,
				transactionId,
				status: decision.isApproved ? "pass" : "fail",
				errorMessage: decision.isApproved ? null : decision.message,
				attemptNumber: 1,
			})
			console.log(
				"✅ Saved liveness validation to database",
				meetingId ? `for meeting ${meetingId}` : ""
			)
		} catch (dbError) {
			console.error("⚠️ Failed to save to database (non-critical):", dbError)
			// Don't fail the whole operation if database save fails
		}

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
			},
		}
	} catch (error) {
		console.error("Failed to get hosted liveness result:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get verification results",
		}
	}
}
