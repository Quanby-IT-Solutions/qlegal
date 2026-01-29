import { z } from "zod/v4"

// Find Best Match schema
export const findBestMatchSchema = z.object({
	serviceType: z.enum(["CONSULTATION", "NOTARIZATION"]),
	sessionMode: z.enum(["REN", "IEN"]),
	documentType: z.string().optional(),
	preferredTimeWindow: z.string().optional(),
	maxRematches: z.number().int().min(0).max(2).default(2),
})

// Get Available ENPs schema
export const getAvailableENPsSchema = z.object({
	sessionMode: z.enum(["REN", "IEN"]).optional(),
	serviceType: z.enum(["CONSULTATION", "NOTARIZATION"]).optional(),
	specialization: z.string().optional(),
	minRating: z.number().min(0).max(5).optional(),
	date: z.date().optional(),
	searchTerm: z.string().optional(),
	sortBy: z.enum(["RATING", "EXPERIENCE", "RECENT", "AVAILABILITY"]).default("RATING"),
	limit: z.number().int().min(1).max(50).default(20),
	offset: z.number().int().min(0).default(0),
})

// Track Quick Match Response schema
export const trackQuickMatchResponseSchema = z.object({
	matchRequestId: z.string(),
	response: z.enum(["ACCEPTED", "DECLINED", "TIMEOUT"]),
	enpId: z.string().optional(),
})

// Type exports
export type FindBestMatchInput = z.infer<typeof findBestMatchSchema>
export type GetAvailableENPsInput = z.infer<typeof getAvailableENPsSchema>
export type TrackQuickMatchResponseInput = z.infer<typeof trackQuickMatchResponseSchema>

// ENP Score Breakdown interface (used in Quick Match algorithm)
export interface ENPScoreBreakdown {
	ratingScore: number
	speedScore: number
	experienceScore: number
	specializationScore: number
	workloadScore: number
	newENPBoost: number
	returningBoost: number
	specialtyBoost: number
	totalScore: number
}

// ENP candidate with score (for Quick Match)
export interface ENPCandidateWithScore {
	candidate: {
		id: number | string
		name: string | null
		email: string | null
		image: string | null
		phoneNumber: string | null
		specialization: string | null
		bio: string | null
		experience: string | null
		languages: string | null
		responseTime: string | null
		rating: number | null
		reviewCount: number | null
		createdAt: Date | null
	}
	breakdown: ENPScoreBreakdown
}

// Get Available ENPs response type - computed display format from transformENPData
export interface GetAvailableENPsResponse {
	total: number
	enps: Array<{
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
	}>
}
