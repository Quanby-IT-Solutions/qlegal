import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { VerificationEmail } from "@/services/react-email/templates/template.verification-email"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendVerificationEmail(email: string, token: string) {
	const confirmLink = `${getUrl()}/auth/verify-email?token=${token}`

	await emailTransporter.sendMail({
		from: `QSign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "QSign: Confirm your email",
		html: await render(VerificationEmail({ email, confirmLink })),
	})
}
