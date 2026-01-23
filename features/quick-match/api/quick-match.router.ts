import { and, count, desc, eq, gte } from "drizzle-orm"
import { z } from "zod/v4"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

/**
 * Quick Match Algorithm
 *
 * Fair bidirectional scoring:
 * - ENP scoring: rating (25%), speed (20%), experience (20%), specialization (15%), workload (20%)
 * - Boosts: new ENP (+15%), returning (+10%), rare specialization (+10%)
 * - Principal scoring: KYC (verified), reliability (show-up rate, payment rate), session history
 */

interface ENPScoreBreakdown {
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

export const quickMatchRouter = createTRPCRouter({
	/**
	 * Calculate Quick Match - find best ENP for principal
	 * Returns: matched ENP with score breakdown, or list of candidates if multiple equal
	 */
	findBestMatch: protectedProcedure
		.input(
			z.object({
				serviceType: z.enum(["CONSULTATION", "NOTARIZATION"]),
				sessionMode: z.enum(["REN", "IEN"]),
				documentType: z.string().optional(), // e.g., "DEED_OF_SALE", "POA"
				preferredTimeWindow: z.string().optional(), // e.g., "TODAY_2_4PM", "ASAP"
				maxRematches: z.number().int().min(0).max(2).default(2),
			})
		)
		.query(async ({ input }) => {
			// TODO: Implement scoring logic
			// 1. Get all available ENPs filtered by:
			//    - Session mode support (REN/IEN)
			//    - Service type availability
			//    - Geolocation (Philippines or embassy)
			//    - Not opted-out of Quick Match
			//
			// 2. For each ENP, calculate score:
			//    - Rating Score (25%): avg review rating, weighted by recency
			//    - Speed Score (20%): avg session duration vs expected, response time
			//    - Experience Score (20%): total sessions completed, years active
			//    - Specialization Match (15%): if documentType specified, expertise in that area
			//    - Workload Balance (20%): fewer recent sessions = higher score
			//
			// 3. Apply boosts:
			//    - New ENP (+15%): first 30 days on platform
			//    - Returning (+10%): was inactive 30+ days, now active for <7 days
			//    - Rare Specialization (+10%): expertise few others have
			//
			// 4. Return top match with score breakdown

			void input

			return {
				enpId: "placeholder",
				enpName: "Atty. Maria Santos",
				rating: 4.8,
				totalSessions: 500,
				specializations: ["Real Estate", "Business Contracts"],
				availableTime: "Today 3:00 PM",
				scoreBreakdown: {
					ratingScore: 25,
					speedScore: 20,
					experienceScore: 20,
					specializationScore: 15,
					workloadScore: 20,
					newENPBoost: 0,
					returningBoost: 0,
					specialtyBoost: 0,
					totalScore: 100,
				} as ENPScoreBreakdown,
			}
		}),

	/**
	 * Get available ENPs list (for Browse tab)
	 * Returns: filterable list of all active ENPs with scores
	 */
	getAvailableENPs: protectedProcedure
		.input(
			z.object({
				sessionMode: z.enum(["REN", "IEN"]).optional(),
				serviceType: z.enum(["CONSULTATION", "NOTARIZATION"]).optional(),
				specialization: z.string().optional(),
				minRating: z.number().min(0).max(5).optional(),
				date: z.date().optional(),
				sortBy: z.enum(["RATING", "EXPERIENCE", "RECENT", "AVAILABILITY"]).default("RATING"),
				limit: z.number().int().min(1).max(50).default(20),
				offset: z.number().int().min(0).default(0),
			})
		)
		.query(async ({ ctx, input }) => {
			const { sessionMode, serviceType, specialization, minRating, date, sortBy, limit, offset } =
				input

			// Build where conditions - use INNER JOIN since we need enpProfiles to exist
			const conditions = [eq(users.role, "ENP"), eq(enpProfiles.isAvailable, true)]

			// Add specialization filter
			if (specialization && specialization !== "all") {
				conditions.push(eq(enpProfiles.specialization, specialization))
			}

			// Add rating filter
			if (minRating !== undefined) {
				conditions.push(gte(enpProfiles.rating, minRating))
			}

			// Note: Date filtering would require ENP availability schedule data
			// For now, date parameter is accepted but not used in filtering
			// TODO: Implement availability checking when enpAvailability table is populated

			// Note: sessionMode and serviceType filtering would require additional
			// database fields for ENP service offerings. For now, filters are accepted
			// but clients should validate response data matches their requirements.

			// Get total count of ENPs matching filters (for pagination metadata)
			const countResult = await ctx.db
				.select({ count: count(users.id).as("count") })
				.from(users)
				.innerJoin(enpProfiles, eq(users.id, enpProfiles.userId))
				.where(and(...conditions))

			const totalCount = Number(countResult?.[0]?.count ?? 0)

			console.log(`[Quick Match] Found ${totalCount} ENPs matching filters`)

			// Query ENPs with their profiles using INNER JOIN
			const enpsData = await ctx.db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
					phoneNumber: users.phoneNumber,
					specialization: enpProfiles.specialization,
					bio: enpProfiles.bio,
					experience: enpProfiles.experience,
					languages: enpProfiles.languages,
					responseTime: enpProfiles.responseTime,
					rating: enpProfiles.rating,
					reviewCount: enpProfiles.reviewCount,
					createdAt: enpProfiles.createdAt,
				})
				.from(users)
				.innerJoin(enpProfiles, eq(users.id, enpProfiles.userId))
				.where(and(...conditions))
				.orderBy(
					sortBy === "RATING"
						? desc(enpProfiles.rating)
						: sortBy === "EXPERIENCE"
							? desc(enpProfiles.experience)
							: sortBy === "RECENT"
								? desc(enpProfiles.createdAt)
								: desc(enpProfiles.rating) // Default to RATING
				)
				.limit(limit)
				.offset(offset)

			console.log(`[Quick Match] Query returned ${enpsData.length} ENP records from database`)

			// Map and transform the data to match ENP interface
			const mappedEnps = enpsData.map(enp => {
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
			})

			return {
				total: totalCount,
				enps: mappedEnps,
			}
		}),

	/**
	 * Calculate Principal score (for ENP to see)
	 * Returns: reliability metrics shown to ENP when they receive Quick Match request
	 */
	getPrincipalScore: protectedProcedure.query(async ({ ctx }) => {
		// TODO: Calculate principal metrics:
		// - KYC verified: boolean
		// - Reliability: show-up rate (attended/total sessions)
		// - Payment success rate: (successful payments)/(total sessions)
		// - Cancellation history: frequency of cancellations
		// - Session history: total completed sessions
		// - ENP reviews: ratings left by previous ENPs

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const principalId = ctx.session.user.id

		return {
			kycVerified: true,
			showUpRate: 0.98,
			paymentRate: 1.0,
			cancellationRate: 0.02,
			totalSessions: 5,
			averageENPRating: 4.9,
		}
	}),

	/**
	 * Track Quick Match request acceptance/decline
	 * For re-match cooldown and ENP penalty tracking
	 */
	trackQuickMatchResponse: protectedProcedure
		.input(
			z.object({
				matchRequestId: z.string(),
				response: z.enum(["ACCEPTED", "DECLINED", "TIMEOUT"]),
				enpId: z.string().optional(),
			})
		)
		.mutation(async ({ input }) => {
			// TODO: Log response, apply penalties if needed:
			// - If DECLINED: apply -5% or -10% penalty to ENP score
			// - If TIMEOUT: auto-decline, apply penalty
			// - If ACCEPTED: create SessionRequest record

			void input

			return { success: true }
		}),
})
