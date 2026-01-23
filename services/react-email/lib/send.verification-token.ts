import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { VerificationTemplate } from "@/services/react-email/templates/template.verification"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendVerificationToken(email: string, token: string) {
	const encodedToken = encodeURIComponent(token)
	const confirmLink = `${getUrl()}/auth/verify-email?token=${encodedToken}`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: "Confirm your email",
		html: await render(VerificationTemplate({ email, confirmLink, siteUrl })),
	})
}
