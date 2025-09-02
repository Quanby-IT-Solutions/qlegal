// Types for the envelope-lite data structure
export interface User {
	id: string
	name: string | null
	email: string | null
	image: string | null
}

export interface Document {
	id: string
	name: string
	type: string
	size: number
	path: string
	createdAt: Date
	signedDocId?: string | null
	status?: "SIGNED" | "PENDING"
	recipients?: Array<{
		id: string
		name: string
		email: string
		role: string
		status: string
		user: User | null
	}>
}

export interface Recipient {
	id: string
	role: string
	status: string
	user: User | null
}

export interface Envelope {
	id: string
	title: string
	description: string | null
	status:
		| "DRAFT"
		| "PUBLISHED"
		| "COMPLETED"
		| "CANCELLED"
		| "PENDING"
		| "PENDING_APPROVAL"
		| "IN_PROGRESS"
		| "SIGNED"
		| "DECLINED"
		| "EXPIRED"
		| "APPROVED"
		| "REJECTED"
	createdAt: Date
	updatedAt: Date
	userId: string
	createdBy: User | null
	documents: Document[]
	recipient: Recipient[]
	_count?: {
		documents: number
		recipient: number
	}
}

export interface NewEnvelope {
	title: string
	description?: string
}

export type EnvelopeStatus = Envelope["status"]

export const statusVariantMap = {
	DRAFT: "outline",
	PUBLISHED: "default",
	COMPLETED: "default",
	CANCELLED: "destructive",
	PENDING: "outline",
	IN_PROGRESS: "outline",
	SIGNED: "default",
	DECLINED: "destructive",
	EXPIRED: "destructive",
	APPROVED: "default",
	PENDING_APPROVAL: "outline",
	REJECTED: "destructive"
} as const

export interface EnvelopeTableProps {
	envelopes: Envelope[]
	isLoading?: boolean
}
