/**
 * HyperVerge Webhook Utilities
 *
 * Helper functions for verifying and processing HyperVerge webhooks
 */

import crypto from "crypto"

/**
 * Verify webhook signature (if HyperVerge provides one)
 *
 * Note: As of Jan 2026, HyperVerge webhook documentation doesn't specify
 * signature verification. This is a placeholder for future implementation.
 *
 * For now, we rely on:
 * 1. HTTPS to ensure data integrity
 * 2. Firewall rules to only allow HyperVerge IPs
 * 3. Webhook secret token (if configured)
 *
 * @param payload - The webhook payload
 * @param signature - The signature from webhook header
 * @param secret - Your webhook secret
 */
export function verifyWebhookSignature(
	payload: string,
	signature: string,
	secret: string
): boolean {
	try {
		const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
	} catch (error) {
		console.error("Error verifying webhook signature:", error)
		return false
	}
}

/**
 * Parse HyperVerge webhook payload
 *
 * HyperVerge webhook payload structure:
 * {
 *   "status": "auto_approved" | "auto_declined" | "needs_review",
 *   "transactionId": "string",
 *   "result": {
 *     "status": "auto_approved",
 *     "transactionId": "string",
 *     "workflowDetails": {...}
 *   }
 * }
 */
export interface HyperVergeWebhookPayload {
	status?: string
	transactionId: string
	timestamp?: string
	result?: {
		status: string
		transactionId: string
		workflowDetails?: Record<string, unknown>
	}
}

/**
 * Interpret HyperVerge webhook status
 */
export function interpretWebhookStatus(status: string): {
	kycStatus: "PENDING" | "VERIFIED" | "REJECTED"
	isApproved: boolean
	needsReview: boolean
	message: string
} {
	switch (status) {
		case "auto_approved":
			return {
				kycStatus: "VERIFIED",
				isApproved: true,
				needsReview: false,
				message: "KYC verification completed successfully. All checks passed.",
			}
		case "auto_declined":
			return {
				kycStatus: "REJECTED",
				isApproved: false,
				needsReview: false,
				message: "KYC verification was declined. Please contact support.",
			}
		case "needs_review":
			return {
				kycStatus: "PENDING",
				isApproved: false,
				needsReview: true,
				message: "KYC verification needs manual review. Please wait for approval.",
			}
		default:
			return {
				kycStatus: "PENDING",
				isApproved: false,
				needsReview: false,
				message: "KYC verification is in progress.",
			}
	}
}
