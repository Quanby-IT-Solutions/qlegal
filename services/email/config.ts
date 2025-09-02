import nodemailer from "nodemailer"

import { env } from "@/env.js"

// Create SMTP transporter
export const createTransporter = () => {
	return nodemailer.createTransport({
		host: String(env.EMAIL_HOST),
		port: Number(env.EMAIL_PORT),
		secure: env.EMAIL_PORT === 465, // true for 465, false for other ports
		auth: {
			user: String(env.EMAIL_USER),
			pass: String(env.EMAIL_PASS),
		},
		// Additional options for better reliability
		pool: true,
		maxConnections: 5,
		maxMessages: 100,
		rateDelta: 1000,
		rateLimit: 5,
	})
}

// Email configuration
export const emailConfig = {
	from: {
		name: String(env.EMAIL_FROM_NAME),
		address: String(env.EMAIL_FROM),
	},
	// Base URL for email links (you can make this configurable)
	baseUrl: env.AUTH_URL,
}

// Verify transporter configuration
export const verifyEmailConfig = async () => {
	try {
		const transporter = createTransporter()
		await transporter.verify()
		console.log("✅ Email configuration verified successfully")
		return true
	} catch (error) {
		console.error("❌ Email configuration verification failed:", error)
		return false
	}
}
