/**
 * HitPay Webhook Handler
 * Verify and process webhook events from HitPay
 * API Reference: https://docs.hitpayapp.com/webhooks
 */

import crypto from "crypto"

export interface WebhookPayload {
	payment_id: string
	payment_request_id: string
	phone?: string
	amount: string
	currency: string
	status: "completed" | "pending" | "failed"
	reference_number?: string
	hmac: string
}

export function verifyWebhookSignature(payload: WebhookPayload, salt: string): boolean {
	const { hmac, ...data } = payload

	const sortedKeys = Object.keys(data).sort()
	const dataString = sortedKeys.map(key => `${key}${data[key as keyof typeof data]}`).join("")

	const computedHmac = crypto.createHmac("sha256", salt).update(dataString).digest("hex")

	return computedHmac === hmac
}

export function handleWebhook(
	payload: WebhookPayload,
	salt: string
): { valid: boolean; data?: Omit<WebhookPayload, "hmac"> } {
	console.log("🔵 Processing HitPay webhook...")
	console.log("   - Payment ID:", payload.payment_id)
	console.log("   - Status:", payload.status)

	const isValid = verifyWebhookSignature(payload, salt)

	if (!isValid) {
		console.error("❌ Invalid webhook signature")
		return { valid: false }
	}

	console.log("✅ Webhook signature verified")

	const { hmac, ...data } = payload
	return {
		valid: true,
		data,
	}
}
