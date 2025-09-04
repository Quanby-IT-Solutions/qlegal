import { render } from "@react-email/render"

import { TwoFactorTokenEmail } from "@/services/react-email/templates/template.two-factor-token-email"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendTwoFactorTokenEmail(email: string, token: string) {
	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "Two-Factor Authentication Token",
		html: await render(TwoFactorTokenEmail({ email, token })),
	})
}
