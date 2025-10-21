import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"

export type DocumentStatus = "SIGNED" | "PENDING" | "UNSIGNED" | "REJECTED"
export type RecipientStatus = "SIGNED" | "UNSIGNED" | "REQUESTED" | "DECLINED"

export interface StatusConfig {
	label: string
	variant: "default" | "secondary" | "destructive" | "outline"
	className: string
	icon?: typeof CheckCircle
}

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
	SIGNED: {
		label: "Signed",
		variant: "outline",
		className: "border-green-200 bg-green-50 text-green-700",
		icon: CheckCircle,
	},
	PENDING: {
		label: "Pending",
		variant: "outline",
		className: "border-amber-200 bg-amber-50 text-amber-700",
		icon: Clock,
	},
	UNSIGNED: {
		label: "Unsigned",
		variant: "outline",
		className: "border-gray-200 bg-gray-50 text-gray-700",
		icon: AlertCircle,
	},
	REJECTED: {
		label: "Rejected",
		variant: "outline",
		className: "border-red-200 bg-red-50 text-red-700",
		icon: XCircle,
	},
}

export const RECIPIENT_STATUS_CONFIG: Record<RecipientStatus, StatusConfig> = {
	SIGNED: {
		label: "Signed",
		variant: "outline",
		className: "border-green-200 bg-green-50 text-green-700",
		icon: CheckCircle,
	},
	UNSIGNED: {
		label: "Unsigned",
		variant: "outline",
		className: "border-gray-200 bg-gray-50 text-gray-700",
		icon: Clock,
	},
	REQUESTED: {
		label: "Requested",
		variant: "outline",
		className: "border-orange-200 bg-orange-50 text-orange-700",
		icon: Clock,
	},
	DECLINED: {
		label: "Declined",
		variant: "outline",
		className: "border-red-200 bg-red-50 text-red-700",
		icon: XCircle,
	},
}

export function getDocumentStatus(
	documentStatus?: string,
	recipients: Array<{ status?: string }> = []
): DocumentStatus {
	if (documentStatus === "SIGNED") {
		return "SIGNED"
	}
	if (recipients.some(r => r.status === "REQUESTED")) {
		return "PENDING"
	}
	return "UNSIGNED"
}

export function getDocumentStatusConfig(status: DocumentStatus): StatusConfig {
	return DOCUMENT_STATUS_CONFIG[status] || DOCUMENT_STATUS_CONFIG.UNSIGNED
}

export function getRecipientStatusConfig(status: RecipientStatus): StatusConfig {
	return RECIPIENT_STATUS_CONFIG[status] || RECIPIENT_STATUS_CONFIG.UNSIGNED
}

export function formatFileSize(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function generateInviteLink(
	envelopeId: string,
	placeholderName: string,
	documentId: string
): string {
	const origin = typeof window !== "undefined" ? window.location.origin : ""
	return `${origin}/envelope/invite?token=${encodeURIComponent(envelopeId)}&placeholder=${encodeURIComponent(placeholderName)}&documentId=${encodeURIComponent(documentId)}`
}
