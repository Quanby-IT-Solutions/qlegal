import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

import AccountApprovalTemplate from "../templates/template.approved-account"

export async function sendAccountApproval(email: string, dashboardLink?: string) {
	const resolvedDashboardLink = dashboardLink ?? `${getUrl()}/dashboard`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: `Your QLegal Account Has Been Approved`,
		html: await render(
			AccountApprovalTemplate({
				userEmail: email,
				dashboardLink: resolvedDashboardLink,
				siteUrl,
			})
		),
	})
}
