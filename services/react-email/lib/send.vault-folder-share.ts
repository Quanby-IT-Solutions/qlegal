import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"
import { getFullName } from "@/core/lib/utils"

import { VaultFolderShareTemplate } from "@/services/react-email/templates/template.vault-folder-share"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendVaultFolderShareEmail({
	enpEmail,
	enpFirstName,
	enpLastName,
	principalName,
	principalEmail,
	folderName,
	fileCount,
	token,
	note,
}: {
	enpEmail: string
	enpFirstName: string | null
	enpLastName: string | null
	principalName: string
	principalEmail?: string | null
	folderName: string
	fileCount: number
	token: string
	note?: string | null
}) {
	const reviewUrl = `${getUrl()}/vault-share/${token}`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL
	const enpName = getFullName({ firstName: enpFirstName, lastName: enpLastName }) || enpEmail

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: enpEmail,
		subject: `${principalName} shared folder “${folderName}” for document review`,
		html: await render(
			VaultFolderShareTemplate({
				enpName,
				principalName,
				principalEmail: principalEmail ?? undefined,
				folderName,
				fileCount,
				reviewUrl,
				note: note ?? undefined,
				siteUrl,
			})
		),
	})
}
