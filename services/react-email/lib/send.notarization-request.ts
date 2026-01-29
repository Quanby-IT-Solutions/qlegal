import { render } from "@react-email/render"

import { NotarizationRequestTemplate } from "@/services/react-email/templates/template.notarization-request"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendNotarizationRequestNotification({
	enpEmail,
	enpName,
	principalName,
	requestTitle,
	requestDescription,
	workflow,
	priority,
	requestUrl,
}: {
	enpEmail: string
	enpName: string
	principalName: string
	requestTitle: string
	requestDescription?: string
	workflow: "REN" | "IEN"
	priority: "NORMAL" | "HIGH" | "URGENT"
	requestUrl: string
}) {
	try {
		const siteUrl = env.NEXT_PUBLIC_SITE_URL
		await emailTransporter.sendMail({
			from: `Quanby Sign <${env.EMAIL_FROM}>`,
			to: enpEmail,
			subject: `New Notarization Request: ${requestTitle}`,
			html: await render(
				NotarizationRequestTemplate({
					enpName,
					principalName,
					requestTitle,
					requestDescription,
					workflow,
					priority,
					requestUrl,
					siteUrl,
				})
			),
		})
		console.log(`✅ Notarization request notification sent to ${enpEmail}`)
	} catch (error) {
		console.error(`❌ Failed to send notarization request notification to ${enpEmail}:`, error)
		// Don't throw - email failure shouldn't break request creation
	}
}
