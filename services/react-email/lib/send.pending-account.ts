import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

import SignupPendingTemplate from "../templates/template.pending-account"

export async function sendSignupPending(
	email: string,
	userName: string,
	accountType: "ENP" | "Client" | "Witness"
) {
	const statusLink = `${getUrl()}/account/status`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: `Your QLegal Account Is Under Review`,
		html: await render(
			SignupPendingTemplate({
				userName,
				userEmail: email,
				accountType,
				statusLink,
				siteUrl,
			})
		),
	})
}
