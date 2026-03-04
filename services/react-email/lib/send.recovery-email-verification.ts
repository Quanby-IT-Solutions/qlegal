import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { RecoveryEmailVerificationTemplate } from "@/services/react-email/templates/template.recovery-email-verification"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendRecoveryEmailVerification(recoveryEmail: string, token: string) {
	const encodedToken = encodeURIComponent(token)
	const confirmLink = `${getUrl()}/auth/verify-recovery-email?token=${encodedToken}`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: recoveryEmail,
		subject: "Verify your recovery email",
		html: await render(RecoveryEmailVerificationTemplate({ recoveryEmail, confirmLink, siteUrl })),
	})
}
