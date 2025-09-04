import { render } from "@react-email/render"

import { TwoFactorAuthTemplate } from "@/services/react-email/templates/template.two-factor-auth"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendTwoFactorAuthToken(name: string, email: string, token: string) {
	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "Two-Factor Authentication Token",
		html: await render(TwoFactorAuthTemplate({ name, email, token })),
	})
}
