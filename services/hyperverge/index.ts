/**
 * HyperVerge KYC Integration Service
 * 
 * This service provides integration with HyperVerge's KYC Onboard Links feature.
 * Onboard Links allow you to send customers a hosted KYC verification link without
 * embedding the SDK in your application.
 * 
 * API Documentation: https://documentation.hyperverge.co/onboard-links
 * API Endpoint: POST https://ind.idv.hyperverge.co/v1/link-kyc/start
 */

import { env } from "@/env"

// HyperVerge API Configuration
// Prefer explicit full URLs if provided; otherwise, use documented defaults
const HYPERVERGE_API_START_URL =
	process.env.HYPERVERGE_API_START_URL ||
	`${(env.HYPERVERGE_API_URL || "https://ind.idv.hyperverge.co").replace(/\/$/, "")}/v1/link-kyc/start`
const HYPERVERGE_API_RESULTS_URL =
	process.env.HYPERVERGE_API_RESULTS_URL ||
	`${(env.HYPERVERGE_API_URL || "https://ind.idv.hyperverge.co").replace(/\/$/, "")}/v1/link-kyc/results`
const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""
const HYPERVERGE_WORKFLOW_ID = env.HYPERVERGE_WORKFLOW_ID || ""

/**
 * Validate HyperVerge credentials are configured
 */
function validateCredentials(): void {
	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}
}

/**
 * Configuration options for creating an onboard link
 */
export interface OnboardLinkConfig {
	/** Unique transaction ID for this KYC session */
	transactionId: string
	/** Workflow ID from HyperVerge dashboard (optional, uses env default) */
	workflowId?: string
	/** URL to redirect after KYC completion */
	redirectUrl?: string
	/** Workflow inputs to satisfy configured checks (if required by workflow) */
	inputs?: Record<string, unknown>
	/** Optional advanced flags per API */
	validateWorkflowInputs?: boolean
	allowEmptyWorkflowInputs?: boolean
	forceCreateLink?: boolean
	forceLaunchSDK?: boolean
	redirectTime?: number
	authenticateOnResume?: boolean
	/** If authenticateOnResume is true, supply only one of these */
	mobileNumber?: string
	email?: string
}

/**
 * Response from creating an onboard link
 */
export interface OnboardLinkResponse {
	status: string
	statusCode: number
	metadata?: {
		requestId: string
	}
	result: {
		/** The onboard link URL to send to the customer (startKycUrl) */
		startKycUrl: string
	}
}

/**
 * Create a HyperVerge Onboard Link
 * 
 * This generates a hosted KYC verification link that can be sent to customers.
 * The link is hosted on HyperVerge servers and implements the configured workflow.
 * 
 * API: POST https://ind.idv.hyperverge.co/v1/link/start
 * 
 * @param config - Configuration for the onboard link
 * @returns The generated onboard link details
 */
export async function createOnboardLink(config: OnboardLinkConfig): Promise<OnboardLinkResponse> {
	console.log("🔵 Creating HyperVerge onboard link...")
	console.log("   - Transaction ID:", config.transactionId)

	validateCredentials()

	const workflowId = config.workflowId || HYPERVERGE_WORKFLOW_ID

	if (!workflowId) {
		throw new Error(
			"HyperVerge workflow ID not configured. Set HYPERVERGE_WORKFLOW_ID in .env or pass workflowId in config"
		)
	}

	// Build request body according to HyperVerge API docs
	const requestBody: Record<string, unknown> = {
		workflowId,
		transactionId: config.transactionId,
	}

	if (config.redirectUrl) {
		requestBody.redirectUrl = config.redirectUrl
	}

	// Map optional API fields (omit if undefined to avoid validation errors)
	if (config.inputs) requestBody.inputs = config.inputs
	if (typeof config.validateWorkflowInputs === "boolean") requestBody.validateWorkflowInputs = config.validateWorkflowInputs
	if (typeof config.allowEmptyWorkflowInputs === "boolean") requestBody.allowEmptyWorkflowInputs = config.allowEmptyWorkflowInputs
	if (typeof config.forceCreateLink === "boolean") requestBody.forceCreateLink = config.forceCreateLink
	if (typeof config.forceLaunchSDK === "boolean") requestBody.forceLaunchSDK = config.forceLaunchSDK
	if (typeof config.redirectTime === "number") requestBody.redirectTime = config.redirectTime
	if (typeof config.authenticateOnResume === "boolean") requestBody.authenticateOnResume = config.authenticateOnResume
	if (config.mobileNumber) requestBody.mobileNumber = config.mobileNumber
	if (config.email) requestBody.email = config.email

	console.log("   - Workflow ID:", workflowId)
	console.log("   - API URL:", HYPERVERGE_API_START_URL)

	try {
		const response = await fetch(HYPERVERGE_API_START_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
			},
			body: JSON.stringify(requestBody),
		})

		const responseText = await response.text()
		console.log("📡 HyperVerge API response status:", response.status)
		console.log("📡 HyperVerge API response:", responseText)

		if (!response.ok) {
			console.error("❌ HyperVerge onboard link creation failed:", responseText)
			throw new Error(`HyperVerge API error: ${response.status} - ${responseText}`)
		}

		const result = JSON.parse(responseText) as OnboardLinkResponse

		if (result.status !== "success") {
			throw new Error(`HyperVerge link error: ${JSON.stringify(result)}`)
		}

		console.log("✅ HyperVerge onboard link created successfully")
		console.log("   - URL:", result.result.startKycUrl)

		return result
	} catch (error) {
		console.error("❌ Failed to create HyperVerge onboard link:", error)
		throw error
	}
}

/**
 * KYC Transaction Status Response
 */
export interface TransactionStatusResponse {
	status: string
	statusCode: number
	result: {
		transactionId: string
		applicationStatus: ApplicationStatus
		workflowDetails?: Record<string, unknown>
	}
}

/**
 * Get the status of a KYC transaction
 * 
 * @param transactionId - The transaction ID to check
 * @returns The transaction status details
 */
export async function getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
	console.log("🔵 Getting HyperVerge transaction status...")
	console.log("   - Transaction ID:", transactionId)

	validateCredentials()

	try {
		const url = `${HYPERVERGE_API_RESULTS_URL}?transactionId=${encodeURIComponent(transactionId)}`
		const response = await fetch(url, {
			method: "GET",
			headers: {
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
			},
		})

		const responseText = await response.text()
		console.log("📡 HyperVerge status response:", response.status)

		if (!response.ok) {
			console.error("❌ HyperVerge status check failed:", responseText)
			throw new Error(`HyperVerge API error: ${response.status} - ${responseText}`)
		}

		const result = JSON.parse(responseText) as TransactionStatusResponse

		console.log("✅ HyperVerge transaction status retrieved")
		console.log("   - Status:", result.result?.applicationStatus)

		return result
	} catch (error) {
		console.error("❌ Failed to get HyperVerge transaction status:", error)
		throw error
	}
}

/**
 * Application status types
 */
export type ApplicationStatus = 
	| "auto_approved"    // All checks passed
	| "auto_declined"    // Verification failed
	| "needs_review"     // Requires manual review
	| "user_cancelled"   // User exited the flow
	| "error"            // Technical failure
	| "pending"          // In progress

/**
 * Helper function to interpret the application status
 */
export function interpretStatus(status: ApplicationStatus): {
	isComplete: boolean
	isApproved: boolean
	needsReview: boolean
	message: string
} {
	switch (status) {
		case "auto_approved":
			return {
				isComplete: true,
				isApproved: true,
				needsReview: false,
				message: "KYC verification completed successfully. All checks passed.",
			}
		case "auto_declined":
			return {
				isComplete: true,
				isApproved: false,
				needsReview: false,
				message: "KYC verification failed. The application was declined.",
			}
		case "needs_review":
			return {
				isComplete: true,
				isApproved: false,
				needsReview: true,
				message: "KYC verification requires manual review.",
			}
		case "user_cancelled":
			return {
				isComplete: true,
				isApproved: false,
				needsReview: false,
				message: "User cancelled the KYC verification process.",
			}
		case "error":
			return {
				isComplete: true,
				isApproved: false,
				needsReview: false,
				message: "An error occurred during KYC verification.",
			}
		case "pending":
		default:
			return {
				isComplete: false,
				isApproved: false,
				needsReview: false,
				message: "KYC verification is in progress.",
			}
	}
}
