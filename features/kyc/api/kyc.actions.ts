"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import {
	createOnboardLink,
	getTransactionStatus,
	interpretStatus,
	type OnboardLinkConfig,
} from "@/services/hyperverge"
import { checkLiveness } from "@/services/hyperverge/liveness"
import { matchFaceSelfieToId, readIdCard } from "@/services/hyperverge/kyc-direct"
import { auth } from "@/services/next-auth"

import { env } from "@/env"

/**
 * Generate a unique transaction ID for KYC based on user ID
 */
function generateTransactionId(userId: string): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `kyc_${userId}_${timestamp}_${random}`.toUpperCase()
}

/**
 * Create a new KYC onboard link for the authenticated user
 * Prevents creating multiple pending transactions by checking for existing valid (non-expired) pending transactions
 */
export async function createUserKycLink() {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	// Check for existing pending transaction
	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			kycTransactionId: true,
			kycStatus: true,
			kycLinkCreatedAt: true,
		},
	})

	// If there's a pending transaction, check if it's expired (24 hours)
	if (user?.kycStatus === "PENDING") {
		// Handle legacy users who don't have kycLinkCreatedAt (treat as expired to allow new link)
		if (!user.kycLinkCreatedAt) {
			console.log("⚠️ Existing PENDING transaction without timestamp (legacy), allowing new link creation")
		} else {
			const linkAge = Date.now() - new Date(user.kycLinkCreatedAt).getTime()
			const expirationTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
			const isExpired = linkAge > expirationTime

			if (!isExpired) {
				// Link is still valid, prevent creating a new one
				return {
					success: false,
					error: "You already have a pending KYC verification. Please resume your existing verification or wait for it to complete.",
					isExpired: false,
				}
			}

			// Link is expired, allow creating a new one
			console.log("⚠️ Existing KYC link has expired, creating new link")
		}
	}

	const transactionId = generateTransactionId(session.user.id)

	// Build redirect URL - use callback page that closes the window
	const baseUrl = env.AUTH_URL ?? "http://localhost:3000"
	const redirectUrl = `${baseUrl}/auth/kyc/callback`

	console.log("🔗 Creating KYC link with redirect:", redirectUrl)

	const config: OnboardLinkConfig = {
		transactionId,
		redirectUrl,
		inputs: {
			email: session.user.email,
			name: session.user.name || "",
			userId: session.user.id,
			createdAt: new Date().toISOString(),
			source: "qsign-kyc-verification",
		},
	}

	try {
		const result = await createOnboardLink(config)

		// Use the transaction ID returned by HyperVerge if available, otherwise use ours
		const actualTransactionId = result.result.transactionId || transactionId

		console.log("📝 Transaction IDs:", {
			generated: transactionId,
			returned: result.result.transactionId,
			using: actualTransactionId,
		})

		const now = new Date()
		const wasExpired = user?.kycStatus === "PENDING" && user.kycLinkCreatedAt
			? Date.now() - new Date(user.kycLinkCreatedAt).getTime() > 24 * 60 * 60 * 1000
			: false

		// Store the transaction ID, link, and creation timestamp in the database
		await db
			.update(users)
			.set({
				kycTransactionId: actualTransactionId,
				kycLink: result.result.startKycUrl,
				kycStatus: "PENDING",
				kycLinkCreatedAt: now,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: true,
			data: {
				transactionId: actualTransactionId,
				url: result.result.startKycUrl,
				isExpiredLink: wasExpired, // Indicate if this was created for an expired link
			},
		}
	} catch (error) {
		console.error("Failed to create KYC link:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create KYC link",
		}
	}
}

/**
 * Direct API KYC (no workflow / no QR).
 *
 * Runs:
 * 1) ID Card Validation API (readId) -> summary.action
 * 2) Selfie Validation API (checkLiveness) -> decision + summary.action
 * 3) Face Match API (matchFace) selfie vs id -> match.value + summary.action
 *
 * Updates users.kycStatus based on the combined outcome.
 *
 * Note: This is server-to-server to avoid exposing appKey in the browser.
 */
export async function runDirectKycVerification(input: {
	countryId: string
	documentId: string
	idImageBase64: string
	selfieImageBase64: string
}) {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return { success: false, error: "User not authenticated" }
	}

	// Basic payload validation
	if (!input.countryId || !input.documentId) {
		return { success: false, error: "countryId and documentId are required" }
	}
	if (!input.idImageBase64 || input.idImageBase64.length < 100) {
		return { success: false, error: "Invalid ID image" }
	}
	if (!input.selfieImageBase64 || input.selfieImageBase64.length < 100) {
		return { success: false, error: "Invalid selfie image" }
	}

	const existingUser = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			status: true,
		},
	})

	if (!existingUser) {
		return { success: false, error: "User not found" }
	}

	const transactionId = generateTransactionId(session.user.id)

	// Mark as pending in DB immediately (so we can track transactionId even if a later step fails)
	await db
		.update(users)
		.set({
			kycTransactionId: transactionId,
			kycLink: null,
			kycStatus: "PENDING",
			kycLinkCreatedAt: new Date(),
		})
		.where(eq(users.id, session.user.id))

	try {
		// 1) ID OCR/validation
		const idResult = await readIdCard({
			transactionId,
			imageBase64: input.idImageBase64,
			countryId: input.countryId,
			documentId: input.documentId,
			expectedDocumentSide: "front",
		})

		// 2) Liveness
		const livenessResult = await checkLiveness({
			image: input.selfieImageBase64,
			transactionId,
			// Enable common quality checks (optional)
			showCaptureInstructions: false,
		})

		// 3) Face match (selfie vs full ID image)
		const faceMatchResult = await matchFaceSelfieToId({
			transactionId,
			selfieBase64: input.selfieImageBase64,
			idBase64: input.idImageBase64,
			returnScore: true,
		})

		const idPass = idResult.summaryAction === "pass"
		const livenessPass = livenessResult.decision?.isApproved === true
		const faceMatchPass = faceMatchResult.matchValue === "yes" && faceMatchResult.summaryAction === "pass"

		// Conservative decisioning:
		// - manualReview from readId/faceMatch -> treat as pending (needs review)
		// - all pass -> verified
		// - any hard fail -> rejected
		let kycStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
		let message = "KYC verification submitted."

		const hasManualReview =
			idResult.summaryAction === "manualReview" || faceMatchResult.summaryAction === "manualReview"

		if (idPass && livenessPass && faceMatchPass) {
			kycStatus = "VERIFIED"
			message = "KYC verified successfully."
		} else if (hasManualReview) {
			kycStatus = "PENDING"
			message = "KYC requires manual review."
		} else {
			kycStatus = "REJECTED"
			message = "KYC verification failed."
		}

		await db
			.update(users)
			.set({
				kycStatus,
				kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
				// Auto-activate account when direct KYC is verified.
				// Never override SUSPENDED here.
				status: kycStatus === "VERIFIED" && existingUser.status === "PENDING" ? "ACTIVE" : existingUser.status,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: true,
			data: {
				transactionId,
				kycStatus,
				message,
				steps: {
					readId: { action: idResult.summaryAction },
					liveness: {
						isApproved: livenessResult.decision?.isApproved ?? false,
						liveFaceValue: livenessResult.decision?.liveFaceValue ?? "unknown",
						summaryAction: livenessResult.decision?.summaryAction ?? "unknown",
					},
					faceMatch: {
						match: faceMatchResult.matchValue,
						action: faceMatchResult.summaryAction,
					},
				},
			},
		}
	} catch (error) {
		console.error("Direct KYC failed:", error)

		await db
			.update(users)
			.set({
				kycStatus: "REJECTED",
				kycVerifiedAt: null,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: false,
			error: error instanceof Error ? error.message : "Direct KYC failed",
			transactionId,
		}
	}
}

/**
 * Check the KYC status of the authenticated user
 */
export async function checkUserKycStatus() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			kycTransactionId: true,
			kycStatus: true,
			kycLink: true,
			status: true,
		},
	})

	if (!user?.kycTransactionId) {
		return {
			success: false,
			error: "No KYC verification found. Please start the verification process.",
		}
	}

	// IMPORTANT:
	// - Hosted link/workflow KYC can be polled via HyperVerge transaction status.
	// - Direct API KYC (readId/checkLiveness/matchFace) does NOT go through the workflow engine,
	//   so HyperVerge "applicationStatus" may remain "started" even when checks have passed.
	//   In that case, our DB is the source of truth and we must NOT overwrite VERIFIED -> PENDING.

	// If our DB already has a final state, return it without polling HyperVerge.
	if (user.kycStatus === "VERIFIED") {
		return {
			success: true,
			data: {
				transactionId: user.kycTransactionId,
				status: "auto_approved",
				kycStatus: "VERIFIED" as const,
				isComplete: true,
				isApproved: true,
				needsReview: false,
				message: "KYC already verified.",
				details: {},
			},
		}
	}

	if (user.kycStatus === "REJECTED") {
		return {
			success: true,
			data: {
				transactionId: user.kycTransactionId,
				status: "auto_declined",
				kycStatus: "REJECTED" as const,
				isComplete: true,
				isApproved: false,
				needsReview: false,
				message: "KYC was rejected.",
				details: {},
			},
		}
	}

	// If it's PENDING but there is no hosted KYC link, assume this is the direct API flow.
	// Do not poll HyperVerge workflow status because it may remain "started" indefinitely.
	if (user.kycStatus === "PENDING" && !user.kycLink) {
		return {
			success: true,
			data: {
				transactionId: user.kycTransactionId,
				status: "needs_review",
				kycStatus: "PENDING" as const,
				isComplete: false,
				isApproved: false,
				needsReview: true,
				message: "KYC is pending review.",
				details: {},
			},
		}
	}

	try {
		const result = await getTransactionStatus(user.kycTransactionId)
		const applicationStatus = result.result.applicationStatus
		const interpretation = interpretStatus(applicationStatus)

		console.log("🔍 KYC Status Check:", {
			transactionId: user.kycTransactionId,
			applicationStatus,
			interpretation,
		})

		// Update the KYC status in the database based on the result
		let newStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
		const updateData: {
			kycStatus: "PENDING" | "VERIFIED" | "REJECTED"
			kycVerifiedAt?: Date
			status?: "ACTIVE" | "PENDING" | "SUSPENDED"
		} = { kycStatus: "PENDING" }

		if (interpretation.isApproved) {
			newStatus = "VERIFIED"
			updateData.kycStatus = "VERIFIED"
			updateData.kycVerifiedAt = new Date()
			console.log("✅ KYC Approved - Updating to VERIFIED")

			// If account was pending, auto-activate on successful KYC.
			// Never override SUSPENDED here.
			if (user.status === "PENDING") {
				updateData.status = "ACTIVE"
			}
		} else if (applicationStatus === "auto_declined" || interpretation.needsReview) {
			newStatus = "REJECTED"
			updateData.kycStatus = "REJECTED"
			console.log("❌ KYC Rejected or Needs Review")
		} else {
			console.log("⏳ KYC Still Pending")
		}

		await db.update(users).set(updateData).where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: true,
			data: {
				transactionId: result.result.transactionId,
				status: applicationStatus,
				kycStatus: newStatus,
				...interpretation,
				details: result.result.workflowDetails,
			},
		}
	} catch (error) {
		console.error("Failed to check KYC status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to check KYC status",
		}
	}
}

/**
 * Retrieve existing KYC link for the authenticated user
 */
export async function getExistingKycLink() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			kycTransactionId: true,
			kycLink: true,
			kycStatus: true,
			kycLinkCreatedAt: true,
		},
	})

	if (!user?.kycTransactionId || !user?.kycLink) {
		return {
			success: false,
			error: "No KYC verification link found. Please start the verification process.",
		}
	}

	if (user.kycStatus !== "PENDING") {
		return {
			success: false,
			error: "KYC verification is not in pending state",
		}
	}

	// Check if link is expired (24 hours)
	if (user.kycLinkCreatedAt) {
		const linkAge = Date.now() - new Date(user.kycLinkCreatedAt).getTime()
		const expirationTime = 24 * 60 * 60 * 1000 // 24 hours
		if (linkAge > expirationTime) {
			return {
				success: false,
				error: "Your verification link has expired. Please create a new link.",
			}
		}
	}

	console.log("🔗 Retrieved existing KYC link for transaction:", user.kycTransactionId)

	return {
		success: true,
		data: {
			transactionId: user.kycTransactionId,
			url: user.kycLink,
		},
	}
}

/**
 * Get the current user's KYC information
 */
export async function getUserKycInfo() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			name: true,
			email: true,
			kycTransactionId: true,
			kycStatus: true,
			kycLinkCreatedAt: true,
		},
	})

	if (!user) {
		return {
			success: false,
			error: "User not found",
		}
	}

	return {
		success: true,
		data: {
			name: user.name,
			email: user.email,
			transactionId: user.kycTransactionId,
			kycStatus: user.kycStatus,
			kycLinkCreatedAt: user.kycLinkCreatedAt,
		},
	}
}

/**
 * Reset KYC status for the authenticated user (for testing/retry)
 */
export async function resetUserKycStatus() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	try {
		await db
			.update(users)
			.set({
				kycTransactionId: null,
				kycLink: null,
				kycStatus: "NOT_STARTED",
				kycVerifiedAt: null,
				kycLinkCreatedAt: null,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: true,
			message: "KYC status reset successfully",
		}
	} catch (error) {
		console.error("Failed to reset KYC status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to reset KYC status",
		}
	}
}
