import { env } from "@/env"

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
	TRANSPORTER: {
		host: env.EMAIL_HOST,
		port: env.EMAIL_PORT,
		secure: env.EMAIL_PORT === 465, // Only use SSL for port 465
		requireTLS: env.EMAIL_PORT === 587, // Use STARTTLS for port 587
		auth: {
			user: env.EMAIL_USER,
			pass: env.EMAIL_PASS,
		},
		pool: true,
		maxConnections: 5,
		maxMessages: 100,
		rateDelta: 1000, // ms
		rateLimit: 5, // messages per rateDelta
	},
} as const
