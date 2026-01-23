/**
 * HitPay Payment Request Service
 * Create and manage payment requests
 * API Reference: https://docs.hitpayapp.com/api-reference/payment-requests
 */

import { makeRequest } from "./client"

export interface CreatePaymentRequestParams {
	email: string
	name?: string
	purpose?: string
	amount: number
	currency?: string
	redirect_url?: string
	webhook?: string
	reference_number?: string
	send_email?: boolean
	send_sms?: boolean
	allow_repeated_payments?: boolean
}

export interface PaymentRequest {
	id: string
	url: string
	status: "pending" | "completed" | "expired" | "failed"
	amount: number
	currency: string
	email: string
	name?: string
	purpose?: string
	reference_number?: string
	created_at: string
	updated_at: string
}

export interface PaymentRequestResponse {
	id: string
	url: string
	status: string
	amount: string
	currency: string
	email: string
	name?: string
	purpose?: string
	reference_number?: string
	created_at: string
	updated_at: string
}

export async function createPaymentRequest(
	params: CreatePaymentRequestParams
): Promise<PaymentRequest> {
	console.log("🔵 Creating HitPay payment request...")
	console.log("   - Email:", params.email)
	console.log("   - Amount:", params.amount, params.currency || "SGD")

	const response = await makeRequest<PaymentRequestResponse>("/payment-requests", {
		method: "POST",
		body: JSON.stringify({
			email: params.email,
			name: params.name,
			purpose: params.purpose || "Payment",
			amount: params.amount,
			currency: params.currency || "SGD",
			redirect_url: params.redirect_url,
			webhook: params.webhook,
			reference_number: params.reference_number,
			send_email: params.send_email ?? false,
			send_sms: params.send_sms ?? false,
			allow_repeated_payments: params.allow_repeated_payments ?? false,
		}),
	})

	console.log("✅ Payment request created successfully")
	console.log("   - Payment ID:", response.id)
	console.log("   - Payment URL:", response.url)

	return {
		id: response.id,
		url: response.url,
		status: response.status as PaymentRequest["status"],
		amount: Number.parseFloat(response.amount),
		currency: response.currency,
		email: response.email,
		name: response.name,
		purpose: response.purpose,
		reference_number: response.reference_number,
		created_at: response.created_at,
		updated_at: response.updated_at,
	}
}

export async function getPaymentRequest(paymentRequestId: string): Promise<PaymentRequest> {
	console.log("🔵 Fetching HitPay payment request...")
	console.log("   - Payment ID:", paymentRequestId)

	const response = await makeRequest<PaymentRequestResponse>(
		`/payment-requests/${paymentRequestId}`,
		{
			method: "GET",
		}
	)

	console.log("✅ Payment request fetched successfully")
	console.log("   - Status:", response.status)

	return {
		id: response.id,
		url: response.url,
		status: response.status as PaymentRequest["status"],
		amount: Number.parseFloat(response.amount),
		currency: response.currency,
		email: response.email,
		name: response.name,
		purpose: response.purpose,
		reference_number: response.reference_number,
		created_at: response.created_at,
		updated_at: response.updated_at,
	}
}

export async function deletePaymentRequest(paymentRequestId: string): Promise<void> {
	console.log("🔵 Deleting HitPay payment request...")
	console.log("   - Payment ID:", paymentRequestId)

	await makeRequest<{ deleted: boolean }>(`/payment-requests/${paymentRequestId}`, {
		method: "DELETE",
	})

	console.log("✅ Payment request deleted successfully")
}
