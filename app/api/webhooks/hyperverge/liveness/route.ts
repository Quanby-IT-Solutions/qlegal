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

import type { NextRequest } from "next/server"

import { getWorkflowOutput } from "@/services/hyperverge/liveness"

/**
 * HyperVerge Webhook Payload
 * Based on Results Webhook documentation
 */
interface HyperVergeWebhookPayload {
	transactionId: string
	workflowId: string
	status: "auto_approved" | "auto_declined" | "needs_review" | "completed"
	result?: {
		action: "pass" | "fail"
	}
}

export async function POST(request: NextRequest) {
	console.log("🔔 Received HyperVerge liveness webhook")

	try {
		// Parse webhook payload
		const payload = (await request.json()) as HyperVergeWebhookPayload

		console.log("📦 Webhook payload:", {
			transactionId: payload.transactionId,
			workflowId: payload.workflowId,
			status: payload.status,
		})

		// Validate required fields
		if (!payload.transactionId) {
			console.error("❌ Missing transactionId in webhook payload")
			return NextResponse.json({ error: "Missing transactionId" }, { status: 400 })
		}

		// Optional: Verify webhook authenticity
		// TODO: Add IP allowlist or signature verification if HyperVerge provides it
		// const signature = request.headers.get("x-hyperverge-signature")
		// if (!verifySignature(signature, payload)) {
		//   return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
		// }

		// Fetch full results from Output API
		// This is called ONCE after webhook notification
		console.log("📥 Fetching full results from Output API...")
		const output = await getWorkflowOutput(payload.transactionId)

		console.log("✅ Results fetched successfully:", {
			transactionId: payload.transactionId,
			isApproved: output.decision?.isApproved,
			summaryAction: output.result.summary.action,
		})

		// TODO: Store results in database for later retrieval
		// Example:
		// await db.livenessVerification.create({
		//   data: {
		//     transactionId: payload.transactionId,
		//     status: output.decision?.isApproved ? "VERIFIED" : "REJECTED",
		//     decision: output.decision,
		//     completedAt: new Date(),
		//   },
		// })

		// Return success to HyperVerge
		return NextResponse.json({
			success: true,
			message: "Webhook processed successfully",
			transactionId: payload.transactionId,
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
