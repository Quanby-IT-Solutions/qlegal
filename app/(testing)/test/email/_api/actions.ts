/* eslint-disable no-console */
"use server"

import { revalidatePath } from "next/cache"

import { sendPasswordResetToken } from "@/services/react-email/lib/send.password-reset-token"
import { sendTwoFactorAuthToken } from "@/services/react-email/lib/send.two-factor-auth-token"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"

type EmailType = "verification" | "password-reset" | "two-fa"

export async function sendTestEmail() {
	const email = ""
	const type: EmailType = "verification"

	const testToken = Math.random().toString(36).substring(2, 8).toUpperCase()

	if (type === "verification") {
		await sendVerificationToken(email, testToken)
	} else if (type === "password-reset") {
		await sendPasswordResetToken(email, testToken)
	} else if (type === "two-fa") {
		await sendTwoFactorAuthToken(email, testToken)
	} else {
		throw new Error("Invalid email type")
	}

	console.log(`✅ ${type} email sent successfully to ${email}`)
	console.log(`Test token: ${testToken}`)

	revalidatePath("/test/email")
}
