// Simplified ENP type for display in browse feature
// This is the return type from transformENPData for displaying ENP data

export interface ENPDisplayData {
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
	experience: string
	languages: string[]
	responseTime: string
	badges: string[]
	location: string
	rate: number
	isAvailable: boolean
}

export interface ENPAvailableSlot {
	time: string
	duration: number
	workflow?: "REN" | "IEN"
}
