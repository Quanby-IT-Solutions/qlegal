import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { PasswordResetTemplate } from "@/services/react-email/templates/template.password-reset"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendPasswordResetToken(email: string, token: string) {
	const resetLink = `${getUrl()}/auth/reset-password?token=${token}`

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "Reset your password",
		html: await render(PasswordResetTemplate({ email, resetLink })),
	})
}
