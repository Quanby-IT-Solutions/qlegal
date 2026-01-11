/**
 * HyperVerge Liveness Webhook Endpoint
 *
 * Receives notifications when hosted workflow completes.
 * This is the preferred method over polling /v1/output API.
 *
 * Configure this URL in your HyperVerge dashboard:
 * https://yourdomain.com/api/webhooks/hyperverge/liveness
 *
 * Webhook Security:
 * - Verify the request comes from HyperVerge IP ranges
 * - Validate the payload signature if HyperVerge provides one
 * - Store results in database for later retrieval
 */

import { NextResponse, type NextRequest } from "next/server"

/**
 * HyperVerge Webhook Payload
 * Based on Results Webhook documentation
 *
 * The webhook sends the full result object matching /v1/output structure
 */
interface HyperVergeWebhookPayload {
	status: "success" | "error"
	statusCode: string
	result: {
		summary: {
			action: "pass" | "fail"
			details: string[]
		}
		details: Array<{
			module: string
			attempts: Array<{
				liveFace?: {
					value: "yes" | "no"
					confidence?: "high" | "medium" | "low"
				}
				qualityChecks?: {
					eyesClosed?: { value: "yes" | "no"; confidence?: string }
					occlusion?: { value: "yes" | "no"; confidence?: string }
					multipleFaces?: { value: "yes" | "no"; confidence?: string }
				}
			}>
		}>
	}
	metadata?: {
		transactionId: string
		requestId: string
	}
}

export async function POST(request: NextRequest) {
	console.log("🔔 Received HyperVerge liveness webhook")

	try {
		// Parse webhook payload
		const payload = (await request.json()) as HyperVergeWebhookPayload

		console.log("📦 Webhook payload received:", {
			status: payload.status,
			statusCode: payload.statusCode,
			transactionId: payload.metadata?.transactionId,
			summaryAction: payload.result?.summary?.action,
		})

		// Validate required fields
		const transactionId = payload.metadata?.transactionId
		if (!transactionId) {
			console.error("❌ Missing transactionId in webhook payload")
			return NextResponse.json({ error: "Missing transactionId" }, { status: 400 })
		}

		// Optional: Verify webhook authenticity
		// TODO: Add IP allowlist verification - HyperVerge sends from specific IP ranges
		// Refer to: https://documentation.hyperverge.co/docs/webhook-integration
		// const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")
		// if (!isHyperVergeIP(clientIp)) {
		//   return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
		// }

		// Process the webhook payload directly (no need to fetch /v1/output again)
		// The webhook already contains the full result matching /v1/output structure
		console.log("📊 Processing webhook result...")

		// Extract liveness data from webhook payload
		let liveFaceValue: "yes" | "no" | "unknown" = "unknown"
		let qualityChecks:
			| {
					eyesClosed?: { value: "yes" | "no"; confidence?: string }
					occlusion?: { value: "yes" | "no"; confidence?: string }
					multipleFaces?: { value: "yes" | "no"; confidence?: string }
			  }
			| undefined = undefined

		if (payload.result?.details && Array.isArray(payload.result.details)) {
			for (const detail of payload.result.details) {
				if (detail.attempts && Array.isArray(detail.attempts)) {
					for (const attempt of detail.attempts) {
						if (attempt.liveFace) {
							liveFaceValue = attempt.liveFace.value
							qualityChecks = attempt.qualityChecks
							break
						}
					}
					if (liveFaceValue !== "unknown") break
				}
			}
		}

		// Import decision logic
		const { makeLivenessDecision } = await import("@/services/hyperverge/liveness")
		const decision = makeLivenessDecision(
			liveFaceValue,
			payload.result.summary?.action,
			qualityChecks
		)

		console.log("✅ Webhook processed successfully:", {
			transactionId,
			isApproved: decision.isApproved,
			summaryAction: decision.summaryAction,
		})

		// TODO: Store results in database for later retrieval
		// const session = await auth() // Get user session if needed
		// await db.insert(livenessValidations).values({
		//   userId: session?.user?.id,
		//   transactionId,
		//   status: decision.isApproved ? "pass" : "fail",
		//   errorMessage: decision.isApproved ? null : decision.message,
		//   attemptNumber: 1,
		// })

		// Return success to HyperVerge
		return NextResponse.json({
			success: true,
			message: "Webhook processed successfully",
			transactionId,
		})
	} catch (error) {
		console.error("❌ Failed to process HyperVerge webhook:", error)

		// Return 200 to prevent HyperVerge from retrying
		// Log the error for manual investigation
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 200 }
		)
	}
}

/**
 * Health check endpoint
 */
export async function GET() {
	return NextResponse.json({
		service: "HyperVerge Liveness Webhook",
		status: "active",
		timestamp: new Date().toISOString(),
	})
}
