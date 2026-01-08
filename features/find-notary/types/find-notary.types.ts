export type WorkflowType = "REN" | "IEN"
export type ConsultationType = "INITIAL" | "FOLLOWUP" | "URGENT"
export type MeetingPreference = "VIDEO_CALL" | "CHAT_ONLY"

export interface EnhancedENP {
	id: string
	name: string | null
	email: string | null
	image: string | null
	phoneNumber: string | null
	emailVerified?: Date | null
	specialization: string
	rating: number
	reviewCount: number
	experience: string
	languages: string[]
	responseTime: string
	location: string
}

export interface AvailabilitySlot {
	date: string | undefined
	time: string
	duration: number
	available: boolean
}

export interface SearchFilters {
	searchTerm: string
	selectedLocation: string
	selectedSpecialization: string
}

export interface BookingState {
	selectedENP: string | null
	bookingWorkflow: WorkflowType
	selectedDate: Date | undefined
	selectedTime: string
	consultationType: ConsultationType
	meetingPreference: MeetingPreference
	specialRequirements: string
	location: string
}

export interface BookConsultationRequest {
	enpId: string
	workflowType: WorkflowType
	appointmentDate: Date
	appointmentTime: string
	consultationType: ConsultationType
	meetingPreference?: MeetingPreference
	specialRequirements?: string
	location?: string
}

export interface BookConsultationResponse {
	workflowType: WorkflowType
	meetingId?: string
	conversationId?: string
}