import { NextRequest, NextResponse } from "next/server"

import { sendPasswordResetEmail } from "@/services/react-email/lib/send.password-reset-email"
import { sendTwoFactorTokenEmail } from "@/services/react-email/lib/send.two-fa-email"
import { sendVerificationEmail } from "@/services/react-email/lib/send.verification-email"

export async function POST(request: NextRequest) {
	try {
		const { email, type } = await request.json()

		if (!email || !type) {
			return NextResponse.json({ error: "Email and type are required" }, { status: 400 })
		}

		// Generate a test token
		const testToken = Math.random().toString(36).substring(2, 8).toUpperCase()

		switch (type) {
			case "verification":
				await sendVerificationEmail(email, testToken)
				break
			case "password-reset":
				await sendPasswordResetEmail(email, testToken)
				break
			case "two-fa":
				await sendTwoFactorTokenEmail(email, testToken)
				break
			default:
				return NextResponse.json(
					{ error: "Invalid email type. Use 'verification', 'password-reset', or 'two-fa'" },
					{ status: 400 }
				)
		}

		return NextResponse.json({
			success: true,
			message: `${type} email sent successfully to ${email}`,
			token: testToken, // For testing purposes
		})
	} catch (error) {
		console.error("Error sending test email:", error)
		return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
	}
}
