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
	return nodemailer.createTransport({
		host: env.EMAIL_HOST,
		port: env.EMAIL_PORT,
		secure: env.EMAIL_PORT === 465, // Only use SSL for port 465
		requireTLS: env.EMAIL_PORT === 587, // Use STARTTLS for port 587
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
