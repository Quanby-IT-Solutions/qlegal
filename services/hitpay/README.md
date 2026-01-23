# HitPay Payment Gateway Integration

This service provides integration with HitPay's Payment Gateway API for processing payments in the e-notary application.

## Overview

HitPay is a payment gateway that enables businesses to accept payments through various methods. This integration implements:

- **Payment Requests**: Create and manage payment requests
- **Webhook Handling**: Secure webhook verification and processing
- **API Client**: Centralized HTTP client with authentication

## API Documentation

Full API documentation: https://docs.hitpayapp.com/introduction

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
HITPAY_API_URL=https://api.hit-pay.com/v1
HITPAY_API_KEY=your_api_key_here
```

## Features

### 1. Payment Requests

Create payment requests that can be sent to customers:

```typescript
import { createPaymentRequest } from "@/services/hitpay"

const payment = await createPaymentRequest({
	email: "customer@example.com",
	name: "John Doe",
	amount: 100.0,
	currency: "SGD",
	purpose: "Notary Service Fee",
	reference_number: "DOC-12345",
	redirect_url: "https://yourapp.com/payment/success",
	webhook: "https://yourapp.com/api/webhooks/hitpay",
})

console.log(payment.url) // Send this URL to customer
```

### 2. Get Payment Status

Check the status of a payment request:

```typescript
import { getPaymentRequest } from "@/services/hitpay"

const payment = await getPaymentRequest("payment_request_id")
console.log(payment.status) // 'pending' | 'completed' | 'expired' | 'failed'
```

### 3. Webhook Handling

Verify and process webhook events:

```typescript
import { handleWebhook, type WebhookPayload } from "@/services/hitpay"

// In your webhook endpoint
export async function POST(request: Request) {
	const payload: WebhookPayload = await request.json()
	const salt = process.env.HITPAY_SALT!

	const result = handleWebhook(payload, salt)

	if (!result.valid) {
		return new Response("Invalid signature", { status: 401 })
	}

	// Process the payment
	const { payment_id, status, amount } = result.data

	if (status === "completed") {
		// Update your database
		await updatePaymentStatus(payment_id, "completed")
	}

	return new Response("OK", { status: 200 })
}
```

## API Reference

### Payment Request Types

```typescript
interface CreatePaymentRequestParams {
	email: string // Customer email (required)
	name?: string // Customer name
	purpose?: string // Payment purpose
	amount: number // Amount in currency units
	currency?: string // Default: 'SGD'
	redirect_url?: string // Success redirect URL
	webhook?: string // Webhook URL for notifications
	reference_number?: string // Your internal reference
	send_email?: boolean // Send email to customer
	send_sms?: boolean // Send SMS to customer
	allow_repeated_payments?: boolean
}

interface PaymentRequest {
	id: string
	url: string // Payment page URL
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
```

### Webhook Payload

```typescript
interface WebhookPayload {
	payment_id: string
	payment_request_id: string
	phone?: string
	amount: string
	currency: string
	status: "completed" | "pending" | "failed"
	reference_number?: string
	hmac: string // Signature for verification
}
```

## Error Handling

All API calls throw errors with descriptive messages:

```typescript
try {
	const payment = await createPaymentRequest(params)
} catch (error) {
	// Error format: "HitPay API error: {status} {statusText} - {errorBody}"
	console.error(error.message)
}
```

## Security

- **API Key**: Stored in environment variables, sent in `X-BUSINESS-API-KEY` header
- **Webhook Verification**: HMAC-SHA256 signature verification
- **HTTPS**: All API calls use HTTPS

## Testing

For testing, use HitPay's sandbox environment:

```env
HITPAY_API_URL=https://api.sandbox.hit-pay.com/v1
HITPAY_API_KEY=your_sandbox_api_key
```

## Integration Example

Complete integration flow:

```typescript
// 1. Create payment request
const payment = await createPaymentRequest({
	email: "customer@example.com",
	amount: 150.0,
	currency: "SGD",
	purpose: "Document Notarization",
	reference_number: notaryRequestId,
	webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hitpay`,
	redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
})

// 2. Store payment ID in database
await db.insert(payments).values({
	id: payment.id,
	notaryRequestId,
	status: payment.status,
	amount: payment.amount,
})

// 3. Redirect user to payment URL
redirect(payment.url)

// 4. Handle webhook (in /api/webhooks/hitpay/route.ts)
const result = handleWebhook(payload, salt)
if (result.valid && result.data.status === "completed") {
	await db
		.update(payments)
		.set({ status: "completed" })
		.where(eq(payments.id, result.data.payment_id))
}
```

## File Structure

```
services/hitpay/
├── index.ts           # Main exports
├── client.ts          # HTTP client and authentication
├── payment-request.ts # Payment request operations
└── webhook.ts         # Webhook verification
```

## Additional Resources

- [HitPay Documentation](https://docs.hitpayapp.com/introduction)
- [HitPay API Reference](https://docs.hitpayapp.com/api-reference)
- [HitPay Dashboard](https://dashboard.hit-pay.com/)
