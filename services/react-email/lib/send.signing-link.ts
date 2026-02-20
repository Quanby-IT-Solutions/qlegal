import { render } from "@react-email/render"

import { SigningLinkTemplate } from "@/services/react-email/templates/template.signing-link"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendSigningLinkEmail(input: {
	to: string
	recipientName: string
	documentName: string
	signingLink: string
	signOrderLabel: string
}) {
	try {
		await emailTransporter.sendMail({
			from: `Quanby Sign <${env.EMAIL_FROM}>`,
			to: input.to,
			subject: `Document ready for signing: ${input.documentName}`,
			html: await render(
				SigningLinkTemplate({
					recipientName: input.recipientName,
					documentName: input.documentName,
					signingLink: input.signingLink,
					signOrderLabel: input.signOrderLabel,
				})
			),
		})
	} catch (error) {
		console.error(`❌ Failed to send signing link email to ${input.to}:`, error)
	}
}
