import { eq, gte, ilike, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"

import { type ENP, type ENPCandidateWithScore, type ENPScoreBreakdown } from "../api/browse.schema"

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

	const ratingScore = ratingNorm * 25
	const speedScore = responseNorm * 20
	const experienceScore = experienceNorm * 20
	const specializationScore = specializationNorm * 15
	const workloadScore = workloadNorm * 20

	// Boosts
	let newENPBoost = 0
	const returningBoost = 0
	let specialtyBoost = 0
	if (candidate.createdAt) {
		const days = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
		if (days <= 30) newENPBoost = 10
	}
	if (specializationNorm >= 0.95) specialtyBoost = 5

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

// Transform database ENP record to ENP type
export function transformENPData(enp: {
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
}): ENP {
	const rating = enp.rating ?? 0
	const reviewCount = enp.reviewCount ?? 0
	const badges: string[] = []

	// Compute badges based on rating and review count
	if (rating >= 4.8) badges.push("Top Rated")
	if (reviewCount >= 50) badges.push("Verified Professional")
	if (reviewCount >= 100) badges.push("Elite")

	return {
		id: enp.id,
		name: enp.name ?? "Electronic Notary Public",
		initials: enp.name
			? enp.name
					.split(" ")
					.map(word => word[0])
					.join("")
					.toUpperCase()
					.slice(0, 2)
			: "EN",
		email: enp.email,
		image: enp.image,
		phoneNumber: enp.phoneNumber,
		specializations: enp.specialization ? [enp.specialization] : ["General"],
		rating,
		reviewCount,
		experience: enp.experience ?? "Experienced",
		languages: (() => {
			const raw = enp.languages
			if (!raw) return ["English"]
			try {
				const parsed = JSON.parse(raw) as unknown
				if (Array.isArray(parsed)) {
					return parsed.map(lang => String(lang))
				}
				return ["English"]
			} catch {
				return ["English"]
			}
		})(),
		responseTime: enp.responseTime ?? "Within 24 hours",
		badges,
		location: "Philippines", // TODO: Add location field to enpProfile schema
		rate: 500, // TODO: Add hourly_rate field to enpProfile schema
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
	const conditions: ReturnType<typeof gte | typeof eq | typeof ilike>[] = []

	if (specialization && specialization !== "all") {
		conditions.push(eq(enpProfiles.specialization, specialization))
	}

	if (minRating !== undefined) {
		conditions.push(gte(enpProfiles.rating, minRating))
	}

	// Add search term filter (search in name, specialization, or languages)
	if (searchTerm && searchTerm.trim()) {
		const searchTermLower = `%${searchTerm.toLowerCase()}%`
		conditions.push(
			or(
				ilike(users.name, searchTermLower),
				ilike(enpProfiles.specialization, searchTermLower),
				ilike(enpProfiles.languages, searchTermLower)
			)!
		)
	}

	return conditions
}
