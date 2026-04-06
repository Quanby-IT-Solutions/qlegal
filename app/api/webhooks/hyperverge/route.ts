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

function hasNameValue(value: string | null | undefined) {
	return Boolean(value && value.trim() !== "")
}

function coalesceNameValue(
	currentValue: string | null | undefined,
	candidateValue: string | null | undefined
) {
	if (hasNameValue(currentValue)) return currentValue
	if (hasNameValue(candidateValue)) return candidateValue?.trim()
	return currentValue ?? null
}

function extractAdditionalFieldString(
	additionalFields: unknown,
	keys: readonly string[]
): string | undefined {
	if (
		!additionalFields ||
		typeof additionalFields !== "object" ||
		Array.isArray(additionalFields)
	) {
		return undefined
	}

	const record = additionalFields as Record<string, unknown>
	for (const key of keys) {
		const value = record[key]
		if (typeof value === "string" && value.trim() !== "") {
			return value.trim()
		}
	}

	return undefined
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
						role: true,
						commissionStatus: true,
						firstName: true,
						middleName: true,
						lastName: true,
						prefix: true,
						suffix: true,
					},
				},
			},
		})

		if (!kycSession?.user) {
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
						idCardDetailId = idCardDetail.idCardDetailId
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

			const latestIdCardDetails = await db.query.idCardDetails.findFirst({
				where: (data, { eq }) => eq(data.userId, user.id),
				orderBy: (table, { desc }) => [desc(table.updatedAt)],
				columns: {
					firstName: true,
					middleName: true,
					lastName: true,
					additionalFields: true,
				},
			})

			const latestPrefix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"prefix",
				"namePrefix",
				"name_prefix",
			])
			const latestSuffix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"suffix",
				"nameSuffix",
				"name_suffix",
			])

			// Update user status and hydrate missing names from verified ID details.
			await db
				.update(users)
				.set({
					kycStatus,
					kycVerifiedAt: new Date(),
					kycLastExpiredAt: null,
					firstName: coalesceNameValue(user.firstName, latestIdCardDetails?.firstName),
					middleName: coalesceNameValue(user.middleName, latestIdCardDetails?.middleName),
					lastName: coalesceNameValue(user.lastName, latestIdCardDetails?.lastName),
					prefix: coalesceNameValue(user.prefix, latestPrefix),
					suffix: coalesceNameValue(user.suffix, latestSuffix),
					// Auto-activate account on successful KYC for non-ENP users. Never override SUSPENDED.
					// For ENP users, keep status as PENDING even after KYC verification.
					commissionStatus:
						user.commissionStatus === "PENDING" && user.role !== "ENP"
							? "ACTIVE"
							: user.commissionStatus,
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

			// Update user KYC status only (don't change commissionStatus for non-verified)
			await db
				.update(users)
				.set({
					kycStatus,
					kycVerifiedAt: null,
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
