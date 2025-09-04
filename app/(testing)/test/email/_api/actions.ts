/* eslint-disable no-console */
"use server"

import { revalidatePath } from "next/cache"

import { sendPasswordResetEmail } from "@/services/react-email/lib/send.password-reset-email"
import { sendTwoFactorTokenEmail } from "@/services/react-email/lib/send.two-fa-email"
import { sendVerificationEmail } from "@/services/react-email/lib/send.verification-email"

type EmailType = "verification" | "password-reset" | "two-fa"

export async function sendTestEmail() {
	const email = ""
	const type: EmailType = "verification"

	const testToken = Math.random().toString(36).substring(2, 8).toUpperCase()

	if (type === "verification") {
		await sendVerificationEmail(email, testToken)
	} else if (type === "password-reset") {
		await sendPasswordResetEmail(email, testToken)
	} else if (type === "two-fa") {
		await sendTwoFactorTokenEmail(email, testToken)
	} else {
		throw new Error("Invalid email type")
	}

	console.log(`✅ ${type} email sent successfully to ${email}`)
	console.log(`Test token: ${testToken}`)

	revalidatePath("/test/email")
}
