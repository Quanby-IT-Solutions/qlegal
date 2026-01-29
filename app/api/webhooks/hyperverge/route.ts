import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"
import {
	fetchImageUrlAsDataUrl,
	getHyperVergeKycLogs,
	pickBestFaceImageUrlFromLogs,
	pickOcrFieldsFromLogs,
} from "@/services/hyperverge/kyc-logs"
import { saveIdCardDetails } from "@/features/kyc/lib/save-id-card-details"

/**
 * HyperVerge webhook payload structure
 */
interface HyperVergeWebhookPayload {
	transactionId?: string
	status?: string
	timestamp?: string
	result?: {
		status?: string
		transactionId?: string
		workflowDetails?: Record<string, unknown>
	}
}

/**
 * HyperVerge Results Webhook Endpoint
 *
 * This endpoint receives notifications from HyperVerge when KYC verification is complete.
 * This is the RECOMMENDED approach per HyperVerge best practices - webhooks instead of polling.
 *
 * Webhook payload example:
 * {
 *   "status": "auto_approved" | "auto_declined" | "needs_review",
 *   "transactionId": "KYC_...",
 *   "timestamp": "2024-01-10T12:00:00Z",
 *   "workflowDetails": {...}
 * }
 *
 * Setup in HyperVerge Dashboard:
 * 1. Go to Settings > Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/hyperverge
 * 3. Enable "Results" event
 */
export async function POST(request: NextRequest) {
	try {
		console.log("📨 Webhook received from HyperVerge")

		// Parse webhook payload
		const payload = (await request.json()) as HyperVergeWebhookPayload
		console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2))

		// Extract transaction details
		const { transactionId, status, result } = payload

		if (!transactionId) {
			console.error("❌ No transactionId in webhook payload")
			return NextResponse.json({ error: "Missing transactionId" }, { status: 400 })
		}

		// Map HyperVerge status to our KYC status
		let kycStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
		const applicationStatus = status ?? result?.status

		if (applicationStatus === "auto_approved") {
			kycStatus = "VERIFIED"
			console.log("✅ KYC Approved via webhook")
		} else if (applicationStatus === "auto_declined") {
			kycStatus = "REJECTED"
			console.log("❌ KYC Rejected via webhook")
		} else if (applicationStatus === "needs_review") {
			kycStatus = "PENDING"
			console.log("⏳ KYC Needs Review via webhook")
		}

		// Find KYC session by transaction ID
		const kycSession = await db.query.kycSessions.findFirst({
			where: eq(kycSessions.transactionId, transactionId),
			with: {
				user: {
					columns: {
						id: true,
						email: true,
						status: true,
					},
				},
			},
		})

		if (!kycSession || !kycSession.user) {
			console.warn(`⚠️ No KYC session found with transactionId: ${transactionId}`)
			// Still return 200 to acknowledge webhook receipt
			return NextResponse.json({
				success: true,
				message: "Transaction ID not found, but webhook acknowledged",
			})
		}

		const user = kycSession.user

		// Update KYC session status
		if (kycStatus === "VERIFIED") {
			// Store hosted-KYC artifacts (reference face + OCR fields)
			// We use Logs API (recommended for full module outputs)
			let idCardDetailId: string | undefined
			if (!kycSession.idCardDetailId) {
				try {
					const logs = await getHyperVergeKycLogs({ transactionId })
					const imageUrl = pickBestFaceImageUrlFromLogs(logs)
					const ocr = pickOcrFieldsFromLogs(logs)

					if (ocr) {
						let faceImageUrl: string | undefined
						if (imageUrl) {
							const dataUrl = await fetchImageUrlAsDataUrl(imageUrl)
							if (dataUrl) {
								faceImageUrl = dataUrl
							}
						}

						// Save to id_card_details table
						const idCardDetail = await saveIdCardDetails(db, {
							userId: user.id,
							rawOcrData: ocr,
							ocrTransactionId: transactionId,
							ocrProvider: "hyperverge",
							faceImageUrl,
							isVerified: true,
							verifiedAt: new Date(),
							verificationMethod: "kyc_mobile_link",
						})
						idCardDetailId = idCardDetail.id
					}
				} catch (e) {
					console.warn("⚠️ Failed to fetch/store hosted KYC artifacts from Logs API:", e)
				}
			}

			// Update KYC session
			await db
				.update(kycSessions)
				.set({
					status: kycStatus,
					idCardDetailId: idCardDetailId ?? kycSession.idCardDetailId,
					verifiedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(kycSessions.id, kycSession.id))

			// Update user status
			await db
				.update(users)
				.set({
					kycStatus,
					kycVerifiedAt: new Date(),
					// Auto-activate account on successful KYC. Never override SUSPENDED.
					status: user.status === "PENDING" ? "ACTIVE" : user.status,
				})
				.where(eq(users.id, user.id))
		} else {
			// Update KYC session for pending/rejected
			await db
				.update(kycSessions)
				.set({
					status: kycStatus,
					updatedAt: new Date(),
				})
				.where(eq(kycSessions.id, kycSession.id))

			// Update user status
			await db
				.update(users)
				.set({
					kycStatus,
					kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
				})
				.where(eq(users.id, user.id))
		}

		console.log(`✅ Updated user ${user.email} KYC status to ${kycStatus}`)

		// TODO: Send real-time notification to user (WebSocket, Server-Sent Events, etc.)
		// TODO: Send email notification

		// Return success response
		return NextResponse.json({
			success: true,
			message: "Webhook processed successfully",
			transactionId,
			status: kycStatus,
		})
	} catch (error) {
		console.error("❌ Error processing HyperVerge webhook:", error)

		// Return 200 even on error to prevent HyperVerge from retrying
		// Log error for manual investigation
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}

/**
 * Health check endpoint
 */
export async function GET() {
	return NextResponse.json({
		status: "ok",
		message: "HyperVerge webhook endpoint is ready",
		timestamp: new Date().toISOString(),
	})
}
