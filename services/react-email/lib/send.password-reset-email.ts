import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { PasswordResetEmail } from "@/services/react-email/templates/template.password-reset-email"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendVerificationEmail(email: string, token: string) {
	const resetLink = `${getUrl()}/auth/reset-password?token=${token}`

	await emailTransporter.sendMail({
		from: `QSign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "QSign: Reset your password",
		html: await render(PasswordResetEmail({ email, resetLink })),
	})
}
