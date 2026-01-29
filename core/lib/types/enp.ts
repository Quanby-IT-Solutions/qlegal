export interface ENPProfile {
	id: string
	name: string | null
	initials: string
	email: string | null
	image: string | null
	phoneNumber: string | null
	specialization: string
	specializations: string[]
	rating: number
	reviewCount: number
	experience?: string
	languages: string[] | string
	responseTime?: string
	location?: string
	rate?: number
	badges?: string[]
	isAvailable?: boolean
}

export interface ENPAvailableSlot {
	time: string
	duration: number
	workflow?: "REN" | "IEN"
}

export interface ENPWithAvailability extends ENPProfile {
	availableSlots: ENPAvailableSlot[]
}

export type WorkflowType = "REN" | "IEN"
export type ServiceType = "CONSULTATION" | "NOTARIZATION"
