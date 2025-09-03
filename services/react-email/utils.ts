/* eslint-disable no-console */
import nodemailer, { type Transporter } from "nodemailer"

import { env } from "@/env.js"

/**
 * Email configuration constants
 */
export const EMAIL_CONFIG = {
	POOL: {
		MAX_CONNECTIONS: 5,
		MAX_MESSAGES: 100,
		RATE_DELTA: 1000, // ms
		RATE_LIMIT: 5, // messages per rateDelta
	},
	SECURE_PORTS: [465, 587] as const,
} as const

/**
 * Email sender configuration
 */
export const EMAIL_SENDER = {
	name: env.EMAIL_FROM_NAME,
	address: env.EMAIL_FROM,
} as const

/**
 * Global email transporter instance
 * Created once and reused across the application
 */
export const emailTransporter = (() => {
	const isSecurePort = EMAIL_CONFIG.SECURE_PORTS.includes(env.EMAIL_PORT as 465 | 587)

	return nodemailer.createTransport({
		host: env.EMAIL_HOST,
		port: env.EMAIL_PORT,
		secure: isSecurePort,
		auth: {
			user: env.EMAIL_USER,
			pass: env.EMAIL_PASS,
		},
		pool: true,
		maxConnections: EMAIL_CONFIG.POOL.MAX_CONNECTIONS,
		maxMessages: EMAIL_CONFIG.POOL.MAX_MESSAGES,
		rateDelta: EMAIL_CONFIG.POOL.RATE_DELTA,
		rateLimit: EMAIL_CONFIG.POOL.RATE_LIMIT,
	})
})()

/**
 * Verifies email configuration by testing the SMTP connection
 * @returns Promise<boolean> - true if verification succeeds, false otherwise
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
	try {
		await emailTransporter.verify()

		console.log("✅ Email configuration verified successfully")
		return true
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		console.error("❌ Email configuration verification failed:", errorMessage)

		// Log additional context for debugging
		console.error("Email host:", env.EMAIL_HOST)
		console.error("Email port:", env.EMAIL_PORT)
		console.error("Email user:", env.EMAIL_USER)

		return false
	}
}

/**
 * Gets the base URL for email links and redirects
 * @returns string - The configured AUTH_URL or fallback
 */
export function getEmailBaseUrl(): string {
	return env.AUTH_URL ?? "http://localhost:3000"
}

/**
 * Creates a complete email configuration object
 * @returns object containing sender info and base URL
 */
export function getEmailConfiguration() {
	return {
		from: EMAIL_SENDER,
		baseUrl: getEmailBaseUrl(),
	} as const
}
