// Type definitions for requests/appointments feature

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
export type AppointmentType = "CONSULTATION" | "DOCUMENT_SIGNING"
export type WorkflowType = "REN" | "IEN"

// User info in appointment
export interface AppointmentUser {
	id: string
	name: string
	email: string
	image: string | null
	phoneNumber: string | null
}

// Complete appointment with client and lawyer info
export interface AppointmentWithDetails {
	id: string
	clientId: string
	lawyerId: string
	type: AppointmentType
	status: AppointmentStatus
	appointmentDate: Date
	duration: number
	notes: string | null
	location: string | null
	meetingLink: string | null
	cancelReason: string | null
	createdAt: Date
	updatedAt: Date
	client: AppointmentUser
	lawyer: AppointmentUser
}

// Filters for requests
export interface RequestFilters {
	search: string
	status: AppointmentStatus | "ALL"
	type: AppointmentType | "ALL"
	workflow: WorkflowType | "ALL"
}

// Stats for dashboard
export interface RequestStats {
	total: number
	pending: number
	confirmed: number
	completed: number
	cancelled: number
	todayCount: number
	upcomingCount: number
}
