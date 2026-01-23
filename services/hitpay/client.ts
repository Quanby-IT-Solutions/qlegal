/**
 * HitPay Payment Gateway Integration Service
 * API Documentation: https://docs.hitpayapp.com/introduction
 */

import { env } from "@/env"

const HITPAY_API_URL = env.HITPAY_API_URL
const HITPAY_API_KEY = env.HITPAY_API_KEY

interface HitPayHeaders {
	"Content-Type": string
	"X-BUSINESS-API-KEY": string
	"X-Requested-With": string
}

function getHeaders(): HitPayHeaders {
	if (!HITPAY_API_KEY) {
		throw new Error("HitPay API key not configured. Set HITPAY_API_KEY in environment variables")
	}

	return {
		"Content-Type": "application/json",
		"X-BUSINESS-API-KEY": HITPAY_API_KEY,
		"X-Requested-With": "XMLHttpRequest",
	}
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${HITPAY_API_URL}${endpoint}`

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				...getHeaders(),
				...options.headers,
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`HitPay API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		return (await response.json()) as T
	} catch (error) {
		console.error("HitPay API request failed:", error)
		throw error
	}
}

export { makeRequest, getHeaders }
