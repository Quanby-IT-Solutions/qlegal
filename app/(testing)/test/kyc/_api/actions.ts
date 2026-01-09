"use server"

import { revalidatePath } from "next/cache"

import {
	createOnboardLink,
	getTransactionStatus,
	interpretStatus,
	type OnboardLinkConfig,
} from "@/services/hyperverge"

/**
 * Generate a unique transaction ID for KYC
 */
function generateTransactionId(): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `kyc_${timestamp}_${random}`.toUpperCase()
}

/**
 * Create a new KYC onboard link
 */
export async function createKycLink(formData: FormData) {
	const email = formData.get("email") as string
	const name = formData.get("name") as string
	const redirectUrl = formData.get("redirectUrl") as string

	if (!email) {
		return {
			success: false,
			error: "Email is required",
		}
	}

	const transactionId = generateTransactionId()

	const config: OnboardLinkConfig = {
		transactionId,
		redirectUrl: redirectUrl || undefined,
		// Provide optional workflow inputs instead of unsupported 'metadata'
		inputs: {
			email,
			...(name ? { name } : {}),
			createdAt: new Date().toISOString(),
			source: "qsign-test-page",
		},
	}

	try {
		const result = await createOnboardLink(config)

		revalidatePath("/test/kyc")

		return {
			success: true,
			data: {
				transactionId,
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
 * Check the status of a KYC transaction
 */
export async function checkKycStatus(transactionId: string) {
	if (!transactionId) {
		return {
			success: false,
			error: "Transaction ID is required",
		}
	}

	try {
		const result = await getTransactionStatus(transactionId)
		const interpretation = interpretStatus(result.result.applicationStatus)

		revalidatePath("/test/kyc")

		return {
			success: true,
			data: {
				transactionId: result.result.transactionId,
				status: result.result.applicationStatus,
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
