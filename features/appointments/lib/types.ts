export interface RequestFilters {
	search: string
	status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
	type: "ALL" | "NOTARIZATION" | "CONSULTATION"
	workflow: "ALL" | "REN" | "IEN"
}

export interface RequestStats {
	total: number
	pending: number
	confirmed: number
	completed: number
	cancelled: number
	todayCount: number
	upcomingCount: number
}

export interface AppointmentWithDetails {
	id: string
	type: "NOTARIZATION" | "CONSULTATION"
	status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
	appointmentDate: Date
	duration: number
	notes: string | null
	location: string | null
	meetingLink: string | null
	cancelReason: string | null
	createdAt: Date
	updatedAt: Date
	clientId: string
	lawyerId: string
	client: {
		id: string
		name: string | null
		email: string | null
		image: string | null
		phoneNumber: string | null
	}
	lawyer: {
		id: string
		name: string | null
		email: string | null
		image: string | null
		phoneNumber: string | null
	}
}
