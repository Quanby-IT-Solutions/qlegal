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
 */
export async function createUserKycLink() {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return {
			success: false,
			error: "User not authenticated",
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

		// Store the transaction ID and link in the database
		await db
			.update(users)
			.set({
				kycTransactionId: actualTransactionId,
				kycLink: result.result.startKycUrl,
				kycStatus: "PENDING",
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/kyc")

		return {
			success: true,
			data: {
				transactionId: actualTransactionId,
				url: result.result.startKycUrl,
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
		},
	})

	if (!user?.kycTransactionId) {
		return {
			success: false,
			error: "No KYC verification found. Please start the verification process.",
		}
	}

	try {
		const result = await getTransactionStatus(user.kycTransactionId)
		const applicationStatus =
			(result.result as any).applicationStatus || (result.result as any).status
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
		} = { kycStatus: "PENDING" }

		if (interpretation.isApproved) {
			newStatus = "VERIFIED"
			updateData.kycStatus = "VERIFIED"
			updateData.kycVerifiedAt = new Date()
			console.log("✅ KYC Approved - Updating to VERIFIED")
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
