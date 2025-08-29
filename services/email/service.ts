import type { RecipientRole } from "@prisma/client"

import { createTransporter, emailConfig } from "./config"
import { prepareApproverAssignmentEmail } from "./templates/assign-approver/service"
import { prepareRecipientAssignmentEmail } from "./templates/assign-signer/service"
import {
	prepareSignatureRejectedEmail,
	type SignatureRejectedParams,
} from "./templates/signatire-rejected/service"
import {
	prepareSignatureApprovedEmail,
	type SignatureApprovedParams,
} from "./templates/signature-approved/service"
import {
	prepareSignatureCompleteEmail,
	type SignatureCompleteParams,
} from "./templates/signature-complete/service"

interface EmailOptions {
	to: string
	subject: string
	html: string
	text?: string
}

interface NotificationParams {
	recipient: { email: string; name?: string | null }
	sender: { name?: string | null; email?: string | null }
	envelope: { id: string; title: string; description?: string | null }
	documents: { id: string; name: string }[]
	role: RecipientRole
}

export class EmailService {
	private transporter

	constructor() {
		this.transporter = createTransporter()
	}

	/**
	 * Send a generic email
	 */
	async sendEmail({ to, subject, html, text }: EmailOptions) {
		try {
			// Safely extract from configuration with fallbacks
			const fromName = String(emailConfig.from.name ?? "Quanby Sign")
			const fromAddress = String(emailConfig.from.address ?? "noreply@quanbysign.com")

			const info = await this.transporter.sendMail({
				from: {
					name: fromName,
					address: fromAddress,
				},
				to,
				subject,
				html,
				text,
			})

			console.log("✅ Email sent successfully:", info.messageId)
			return { success: true, messageId: info.messageId }
		} catch (error) {
			console.error("❌ Failed to send email:", error)
			throw new Error(
				`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`
			)
		}
	}

	/**
	 * Send role-based assignment notification
	 * This method handles both recipient and approver notifications based on the role
	 */
	async sendRoleBasedNotification({
		recipient,
		sender,
		envelope,
		documents,
		role,
	}: NotificationParams) {
		try {
			// Use the appropriate template based on role
			const emailData =
				role === "APPROVER"
					? await prepareApproverAssignmentEmail({
							recipient,
							sender,
							envelope,
							documents,
							role,
						})
					: await prepareRecipientAssignmentEmail({
							recipient,
							sender,
							envelope,
							documents,
							role,
						})

			return await this.sendEmail(emailData)
		} catch (error) {
			console.error(`❌ Failed to send ${role.toLowerCase()} assignment notification:`, error)
			throw error
		}
	}

	/**
	 * Send recipient assignment notification
	 * @deprecated Use sendRoleBasedNotification instead
	 */
	async sendRecipientAssignmentNotification(params: NotificationParams) {
		return this.sendRoleBasedNotification(params)
	}

	/**
	 * Send approver assignment notification
	 * @deprecated Use sendRoleBasedNotification instead
	 */
	async sendApproverAssignmentNotification(params: NotificationParams) {
		return this.sendRoleBasedNotification(params)
	}

	/**
	 * Send signature approved notification to envelope creator
	 */
	async sendSignatureApprovedNotification(params: SignatureApprovedParams) {
		try {
			const emailData = await prepareSignatureApprovedEmail(params)
			return await this.sendEmail(emailData)
		} catch (error) {
			console.error("❌ Failed to send signature approved notification:", error)
			throw error
		}
	}

	/**
	 * Send signature rejected notification to envelope creator
	 */
	async sendSignatureRejectedNotification(params: SignatureRejectedParams) {
		try {
			const emailData = await prepareSignatureRejectedEmail(params)
			return await this.sendEmail(emailData)
		} catch (error) {
			console.error("❌ Failed to send signature rejected notification:", error)
			throw error
		}
	}

	/**
	 * Send signature complete notification to envelope creator
	 */
	async sendSignatureCompleteNotification(params: SignatureCompleteParams) {
		try {
			const emailData = await prepareSignatureCompleteEmail(params)
			return await this.sendEmail(emailData)
		} catch (error) {
			console.error("❌ Failed to send signature complete notification:", error)
			throw error
		}
	}

	/**
	 * Verify email service configuration
	 */
	async verifyConfiguration() {
		try {
			await this.transporter.verify()
			console.log("✅ Email service configuration verified")
			return true
		} catch (error) {
			console.error("❌ Email service configuration failed:", error)
			return false
		}
	}
}

// Export singleton instance
export const emailService = new EmailService()
