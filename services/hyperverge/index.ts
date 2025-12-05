/**
 * HyperVerge KYC Integration Service
 * 
 * This service provides integration with HyperVerge's KYC Onboard Links feature.
 * Onboard Links allow you to send customers a hosted KYC verification link without
 * embedding the SDK in your application.
 * 
 * Documentation: https://docs.hyperverge.co/
 */

import { env } from "@/env"

// HyperVerge API Configuration
const HYPERVERGE_API_BASE = env.HYPERVERGE_API_URL || "https://ind.idv.hyperverge.co"
const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""
const HYPERVERGE_WORKFLOW_ID = env.HYPERVERGE_WORKFLOW_ID || ""

/**
 * Token cache for HyperVerge access tokens
 * Access tokens are short-lived and need to be refreshed periodically
 */
interface TokenCache {
	token: string
	expiresAt: number
}

let accessTokenCache: TokenCache | null = null

// Token expiration buffer - refresh 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Generate HyperVerge access token
 * This token is required for all API calls to HyperVerge
 * 
 * @returns Access token string
 */
export async function generateAccessToken(forceRefresh = false): Promise<string> {
	console.log("🔵 Generating HyperVerge access token...")

	// Check cache first (unless forcing refresh)
	if (!forceRefresh && accessTokenCache) {
		const now = Date.now()
		if (accessTokenCache.expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
			console.log("✅ Using cached HyperVerge token")
			return accessTokenCache.token
		}
	}

	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}

	try {
		const response = await fetch(`${HYPERVERGE_API_BASE}/v1/link/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"appId": HYPERVERGE_APP_ID,
				"appKey": HYPERVERGE_APP_KEY,
			},
			body: JSON.stringify({
				expiry: 900, // Token expires in 15 minutes (900 seconds)
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ HyperVerge token generation failed:", errorText)
			throw new Error(`HyperVerge API error: ${response.status} - ${errorText}`)
		}

		const result = await response.json() as { 
			status: string
			statusCode: number
			result: { token: string; expiry: number }
		}

		if (result.status !== "success") {
			throw new Error(`HyperVerge token error: ${JSON.stringify(result)}`)
		}

		const token = result.result.token
		const expirySeconds = result.result.expiry || 900

		// Cache the token
		accessTokenCache = {
			token,
			expiresAt: Date.now() + expirySeconds * 1000,
		}

		console.log("✅ HyperVerge access token generated successfully")
		return token
	} catch (error) {
		console.error("❌ Failed to generate HyperVerge token:", error)
		throw error
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
	/** Default language for the KYC flow */
	defaultLanguage?: string
	/** User inputs to pre-fill in the KYC flow */
	inputs?: Record<string, string>
	/** Custom fields for the transaction */
	customFields?: Record<string, string>
}

/**
 * Response from creating an onboard link
 */
export interface OnboardLinkResponse {
	status: string
	statusCode: number
	result: {
		/** The onboard link URL to send to the customer */
		url: string
		/** Start time of the link validity */
		startTime: string
		/** Expiry time of the link */
		expiry: string
	}
}

/**
 * Create a HyperVerge Onboard Link
 * 
 * This generates a hosted KYC verification link that can be sent to customers.
 * The link is hosted on HyperVerge servers and implements the configured workflow.
 * 
 * @param config - Configuration for the onboard link
 * @returns The generated onboard link details
 */
export async function createOnboardLink(config: OnboardLinkConfig): Promise<OnboardLinkResponse> {
	console.log("🔵 Creating HyperVerge onboard link...")
	console.log("   - Transaction ID:", config.transactionId)

	const accessToken = await generateAccessToken()
	const workflowId = config.workflowId || HYPERVERGE_WORKFLOW_ID

	if (!workflowId) {
		throw new Error(
			"HyperVerge workflow ID not configured. Set HYPERVERGE_WORKFLOW_ID in .env or pass workflowId in config"
		)
	}

	const requestBody: Record<string, unknown> = {
		workflowId,
		transactionId: config.transactionId,
	}

	if (config.redirectUrl) {
		requestBody.redirectUrl = config.redirectUrl
	}

	if (config.defaultLanguage) {
		requestBody.defaultLanguage = config.defaultLanguage
	}

	if (config.inputs) {
		requestBody.inputs = config.inputs
	}

	if (config.customFields) {
		requestBody.customFields = config.customFields
	}

	try {
		const response = await fetch(`${HYPERVERGE_API_BASE}/v1/link/start`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${accessToken}`,
				"appId": HYPERVERGE_APP_ID,
				"appKey": HYPERVERGE_APP_KEY,
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ HyperVerge onboard link creation failed:", errorText)
			throw new Error(`HyperVerge API error: ${response.status} - ${errorText}`)
		}

		const result = await response.json() as OnboardLinkResponse

		if (result.status !== "success") {
			throw new Error(`HyperVerge link error: ${JSON.stringify(result)}`)
		}

		console.log("✅ HyperVerge onboard link created successfully")
		console.log("   - URL:", result.result.url)
		console.log("   - Expiry:", result.result.expiry)

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
		applicationStatus: "auto_approved" | "auto_declined" | "needs_review" | "user_cancelled" | "error" | "pending"
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

	const accessToken = await generateAccessToken()

	try {
		const response = await fetch(`${HYPERVERGE_API_BASE}/v1/link/results?transactionId=${transactionId}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
				"appId": HYPERVERGE_APP_ID,
				"appKey": HYPERVERGE_APP_KEY,
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ HyperVerge status check failed:", errorText)
			throw new Error(`HyperVerge API error: ${response.status} - ${errorText}`)
		}

		const result = await response.json() as TransactionStatusResponse

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
