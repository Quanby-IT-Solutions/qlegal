import type { Appointment } from "@/services/drizzle/schema/appointments"

export type ConsultationWorkflowType = "REN" | "IEN"
export type ConsultationType = "INITIAL" | "FOLLOWUP" | "URGENT"
export type ConsultationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"

export interface ConsultationDetails extends Appointment {
	workflowType?: ConsultationWorkflowType
	consultationType?: ConsultationType
	client?: {
		id: string
		name: string | null
		email: string | null
		image: string | null
		phoneNumber: string | null
	}
	lawyer?: {
		id: string
		name: string | null
		email: string | null
		image: string | null
		phoneNumber: string | null
	}
}

export interface AvailabilitySlot {
	date: string // YYYY-MM-DD
	time: string // HH:MM
	duration: number // minutes
	available: boolean
}

export interface EnpProfile {
	id: string
	name: string | null
	email: string | null
	image: string | null
	phoneNumber: string | null
	specialization: string
	rating: number
	reviewCount: number
	experience: string
	languages: string[]
	responseTime: string
}

export interface BookConsultationResult {
	appointment: Appointment
	meetingId?: string
	roomId?: string
	conversationId?: string
	workflowType: ConsultationWorkflowType
}
