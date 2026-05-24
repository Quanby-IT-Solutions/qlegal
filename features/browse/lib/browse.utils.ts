import { eq, gte, ilike, or, sql, type InferSelectModel } from "drizzle-orm"

import { getFullName } from "@/core/lib/utils"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { getAvatarPublicUrl } from "@/services/supabase/presigned-url"

import { type ENPCandidateWithScore, type ENPScoreBreakdown } from "../api/browse.schema"
import {
	BADGE_LABELS,
	BADGE_THRESHOLDS,
	DEFAULT_ENP_VALUES,
	NEW_ENP_DAYS_THRESHOLD,
	SCORE_BOOSTS,
	SCORE_WEIGHTS,
} from "./browse.constants"

// Combined type for ENP data from user + enpProfiles tables (INNER JOIN result)
type EnpCombined = Readonly<{
	// From users table
	id: InferSelectModel<typeof users>["id"]
	firstName: InferSelectModel<typeof users>["firstName"]
	middleName: InferSelectModel<typeof users>["middleName"]
	lastName: InferSelectModel<typeof users>["lastName"]
	email: InferSelectModel<typeof users>["email"]
	image: InferSelectModel<typeof users>["image"]
	phoneNumber: InferSelectModel<typeof users>["phoneNumber"]
	// From enpProfiles table
	specialization: InferSelectModel<typeof enpProfiles>["specialization"]
	bio: InferSelectModel<typeof enpProfiles>["bio"]
	experience: InferSelectModel<typeof enpProfiles>["experience"]
	languages: InferSelectModel<typeof enpProfiles>["languages"]
	responseTime: InferSelectModel<typeof enpProfiles>["responseTime"]
	rating: InferSelectModel<typeof enpProfiles>["rating"]
	reviewCount: InferSelectModel<typeof enpProfiles>["reviewCount"]
	createdAt: InferSelectModel<typeof enpProfiles>["createdAt"]
}>

// Helper: normalize rating 0..5 -> 0..1
export function normalizeRating(r?: number | null) {
	return Math.min(Math.max((r ?? 0) / 5, 0), 1)
}

// Helper: approximate response speed from text
export function normalizeResponse(text?: string | null) {
	if (!text) return 0.5
	const t = text.toLowerCase()
	if (t.includes("minute")) return 1.0
	if (t.includes("hour")) return 0.8
	if (t.includes("day")) return 0.4
	return 0.6
}

// Helper: specialization match coefficient
export function specializationMatch(specialization?: string | null, documentType?: string) {
	if (!documentType) return 0.6 // neutral when not specified
	const spec = (specialization ?? "").toLowerCase()
	const doc = documentType.toLowerCase()
	// naive grouping
	if (doc.includes("real") && spec.includes("real estate")) return 1.0
	if ((doc.includes("poa") || doc.includes("affidavit")) && spec.includes("affidavit")) return 1.0
	if (doc.includes("loan") && (spec.includes("business") || spec.includes("contracts"))) return 0.9
	return spec ? 0.6 : 0.5
}

// Helper: concurrency control for async operations
export async function asyncPool<T>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<void>
) {
	const executing = new Set<Promise<void>>()
	for (const item of items) {
		const p = fn(item).finally(() => executing.delete(p))
		executing.add(p)
		if (executing.size >= concurrency) {
			await Promise.race(executing)
		}
	}
	await Promise.all(executing)
}

// Compute score breakdown for a single ENP candidate
export function computeENPScore(
	candidate: ENPCandidateWithScore["candidate"],
	documentType?: string
): ENPScoreBreakdown {
	const ratingNorm = normalizeRating(candidate.rating)
	const responseNorm = normalizeResponse(candidate.responseTime)
	const reviews = Math.max(candidate.reviewCount ?? 0, 0)
	const experienceNorm = Math.min(reviews / 100, 1) // proxy when explicit years absent
	const specializationNorm = specializationMatch(candidate.specialization, documentType)
	// Reward less recent workload (proxy using review count inverse)
	const workloadNorm = 1 - Math.min(reviews / 100, 1)

	const ratingScore = ratingNorm * SCORE_WEIGHTS.RATING
	const speedScore = responseNorm * SCORE_WEIGHTS.SPEED
	const experienceScore = experienceNorm * SCORE_WEIGHTS.EXPERIENCE
	const specializationScore = specializationNorm * SCORE_WEIGHTS.SPECIALIZATION
	const workloadScore = workloadNorm * SCORE_WEIGHTS.WORKLOAD

	// Boosts
	let newENPBoost = 0
	const returningBoost = SCORE_BOOSTS.RETURNING
	let specialtyBoost = 0
	if (candidate.createdAt) {
		const days = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
		if (days <= NEW_ENP_DAYS_THRESHOLD) newENPBoost = SCORE_BOOSTS.NEW_ENP
	}
	if (specializationNorm >= 0.95) specialtyBoost = SCORE_BOOSTS.SPECIALTY

	const totalScore =
		ratingScore +
		speedScore +
		experienceScore +
		specializationScore +
		workloadScore +
		newENPBoost +
		returningBoost +
		specialtyBoost

	return {
		ratingScore,
		speedScore,
		experienceScore,
		specializationScore,
		workloadScore,
		newENPBoost,
		returningBoost,
		specialtyBoost,
		totalScore,
	}
}

// Transform database ENP record to display format
export async function transformENPData(enp: EnpCombined): Promise<{
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
}> {
	const rating = enp.rating ?? 0
	const reviewCount = enp.reviewCount ?? 0
	const badges: string[] = []
	const imageUrl = await getAvatarPublicUrl(enp.image)

	// Compute badges based on rating and review count
	if (rating >= BADGE_THRESHOLDS.TOP_RATED_RATING) {
		badges.push(BADGE_LABELS.TOP_RATED)
	}
	if (reviewCount >= BADGE_THRESHOLDS.VERIFIED_PROFESSIONAL_REVIEWS) {
		badges.push(BADGE_LABELS.VERIFIED_PROFESSIONAL)
	}
	if (reviewCount >= BADGE_THRESHOLDS.ELITE_REVIEWS) {
		badges.push(BADGE_LABELS.ELITE)
	}

	const fullName = getFullName(enp) || "Electronic Notary Public"
	return {
		id: String(enp.id),
		name: fullName,
		initials: fullName
			? fullName
					.split(" ")
					.map(word => word[0])
					.join("")
					.toUpperCase()
					.slice(0, 2)
			: "EN",
		email: enp.email,
		image: imageUrl,
		phoneNumber: enp.phoneNumber,
		specialization: enp.specialization ?? "General",
		specializations: enp.specialization
			? [enp.specialization]
			: [DEFAULT_ENP_VALUES.SPECIALIZATION],
		rating,
		reviewCount,
		experience: enp.experience ?? DEFAULT_ENP_VALUES.EXPERIENCE,
		languages: (() => {
			const raw = enp.languages
			if (!raw) return [...DEFAULT_ENP_VALUES.LANGUAGES]
			try {
				const parsed = JSON.parse(raw) as unknown
				if (Array.isArray(parsed)) {
					return parsed.map(lang => String(lang))
				}
				return [...DEFAULT_ENP_VALUES.LANGUAGES]
			} catch {
				return [...DEFAULT_ENP_VALUES.LANGUAGES]
			}
		})(),
		responseTime: enp.responseTime ?? DEFAULT_ENP_VALUES.RESPONSE_TIME,
		badges,
		location: DEFAULT_ENP_VALUES.LOCATION, // TODO: Add location field to enpProfile schema
		rate: DEFAULT_ENP_VALUES.RATE, // TODO: Add hourly_rate field to enpProfile schema
		isAvailable: true,
	}
}

// Build where conditions for ENP queries
export function buildENPWhereConditions({
	specialization,
	minRating,
	searchTerm,
}: {
	specialization?: string
	minRating?: number
	searchTerm?: string
}) {
	const conditions: ReturnType<typeof gte | typeof ilike>[] = []

	if (specialization && specialization !== "all") {
		conditions.push(eq(enpProfiles.specialization, specialization))
	}

	if (minRating !== undefined) {
		conditions.push(gte(enpProfiles.rating, minRating))
	}

	// Add search term filter (search in full name, specialization, or languages)
	if (searchTerm?.trim()) {
		const searchTermLower = `%${searchTerm.toLowerCase()}%`
		conditions.push(
			or(
				ilike(
					sql`concat_ws(' ', coalesce(${users.firstName},''), coalesce(${users.middleName},''), coalesce(${users.lastName},''))`,
					searchTermLower
				),
				ilike(enpProfiles.specialization, searchTermLower),
				ilike(enpProfiles.languages, searchTermLower)
			)!
		)
	}

	return conditions
}
