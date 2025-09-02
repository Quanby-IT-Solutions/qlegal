"use server"

import type { RecipientRole } from "@prisma/client"

import { emailService } from "@/services/email/service"

export interface NotifyRecipientParams {
	recipient: {
		email: string
		name?: string | null
	}
	sender: {
		name?: string | null
		email?: string | null
	}
	envelope: {
		id: string
		title: string
		description?: string | null
	}
	documents: {
		id: string
		name: string
	}[]
	role: RecipientRole
}

/**
 * Send email notification to a newly assigned recipient
 */
export async function notifyRecipientAssignment(params: NotifyRecipientParams) {
	try {
		await emailService.sendRecipientAssignmentNotification(params)
		console.log(`✅ Email sent to ${params.recipient.email} for envelope ${params.envelope.id}`)
	} catch (error) {
		console.error(`❌ Failed to send email to ${params.recipient.email}:`, error)
		// Don't throw error to prevent failing the entire operation
		// Email notification failure shouldn't stop the envelope creation
	}
}

/**
 * Send email notifications to multiple recipients
 */
export async function notifyMultipleRecipients(notifications: NotifyRecipientParams[]) {
	const results = await Promise.allSettled(notifications.map(notifyRecipientAssignment))

	const failures = results.filter(result => result.status === "rejected")
	if (failures.length > 0) {
		console.warn(`⚠️ ${failures.length} email notifications failed to send`)
	}

	console.log(
		`📧 Email notifications: ${results.length - failures.length}/${results.length} sent successfully`
	)
}

export interface NotifyApproverParams {
	recipient: {
		email: string
		name?: string | null
	}
	sender: {
		name?: string | null
		email?: string | null
	}
	envelope: {
		id: string
		title: string
		description?: string | null
	}
	documents: {
		id: string
		name: string
	}[]
	role: RecipientRole
}

/**
 * Send email notification to an approver when envelope is published
 */
export async function notifyApproverAssignment(params: NotifyApproverParams) {
	try {
		await emailService.sendApproverAssignmentNotification(params)
		console.log(
			`✅ Approver email sent to ${params.recipient.email} for envelope ${params.envelope.id}`
		)
	} catch (error) {
		console.error(`❌ Failed to send approver email to ${params.recipient.email}:`, error)
		// Don't throw error to prevent failing the entire operation
		// Email notification failure shouldn't stop the envelope publication
	}
}

export interface NotifySignatureApprovedParams {
	recipient: {
		email: string
		name?: string | null
	}
	approver: {
		name?: string | null
		email?: string | null
	}
	envelope: {
		id: string
		title: string
		description?: string | null
	}
	documents: {
		id: string
		name: string
	}[]
	approvalDate: Date
}

/**
 * Send email notification to envelope creator when envelope is approved
 */
export async function notifySignatureApproved(params: NotifySignatureApprovedParams) {
	try {
		await emailService.sendSignatureApprovedNotification(params)
		console.log(
			`✅ Signature approved email sent to ${params.recipient.email} for envelope ${params.envelope.id}`
		)
	} catch (error) {
		console.error(`❌ Failed to send signature approved email to ${params.recipient.email}:`, error)
		// Don't throw error to prevent failing the entire operation
		// Email notification failure shouldn't stop the approval process
	}
}

export interface NotifySignatureRejectedParams {
	recipient: {
		email: string
		name?: string | null
	}
	rejector: {
		name?: string | null
		email?: string | null
	}
	envelope: {
		id: string
		title: string
		description?: string | null
	}
	documents: {
		id: string
		name: string
	}[]
	rejectionDate: Date
	rejectionReason?: string | null
	comments?: string | null
}

/**
 * Send email notification to envelope creator when envelope is rejected
 */
export async function notifySignatureRejected(params: NotifySignatureRejectedParams) {
	try {
		await emailService.sendSignatureRejectedNotification(params)
		console.log(
			`✅ Signature rejected email sent to ${params.recipient.email} for envelope ${params.envelope.id}`
		)
	} catch (error) {
		console.error(`❌ Failed to send signature rejected email to ${params.recipient.email}:`, error)
		// Don't throw error to prevent failing the entire operation
		// Email notification failure shouldn't stop the rejection process
	}
}

export interface NotifySignatureCompleteParams {
	recipient: {
		email: string
		name?: string | null
	}
	envelope: {
		id: string
		title: string
		description?: string | null
	}
	documents: {
		id: string
		name: string
	}[]
	completionDate: Date
	signers: {
		name?: string | null
		email: string
	}[]
}

/**
 * Send email notification to envelope creator when envelope is completed
 */
export async function notifySignatureComplete(params: NotifySignatureCompleteParams) {
	try {
		await emailService.sendSignatureCompleteNotification(params)
		console.log(
			`✅ Signature complete email sent to ${params.recipient.email} for envelope ${params.envelope.id}`
		)
	} catch (error) {
		console.error(`❌ Failed to send signature complete email to ${params.recipient.email}:`, error)
		// Don't throw error to prevent failing the entire operation
		// Email notification failure shouldn't stop the completion process
	}
}
