import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { buildENPWhereConditions, computeENPScore, transformENPData } from "../lib/browse.utils"
import {
	findBestMatchSchema,
	getAvailableENPsSchema,
	trackQuickMatchResponseSchema,
	type ENPCandidateWithScore,
	type GetAvailableENPsResponse,
} from "./browse.schema"

export const browseRouter = createTRPCRouter({
	/**
	 * Quick Match Algorithm
	 *
	 * Fair bidirectional scoring:
	 * - ENP scoring: rating (25%), speed (20%), experience (20%), specialization (15%), workload (20%)
	 * - Boosts: new ENP (+15%), returning (+10%), rare specialization (+10%)
	 * - Principal scoring: KYC (verified), reliability (show-up rate, payment rate), session history
	 */

	/**
	 * Calculate Quick Match - find best ENP for principal
	 * Returns: matched ENP with score breakdown, or list of candidates if multiple equal
	 */
	findBestMatch: protectedProcedure.input(findBestMatchSchema).query(async ({ ctx, input }) => {
		// Query available ENPs
		const conditions = [eq(users.role, "ENP"), eq(enpProfiles.isAvailable, true)]

		const candidates = await ctx.db
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
			.orderBy(desc(enpProfiles.rating))
			.limit(50)

		if (!candidates.length) {
			return null
		}

		// Compute scores
		const scored: ENPCandidateWithScore[] = candidates.map(c => ({
			candidate: c,
			breakdown: computeENPScore(c, input.documentType),
		}))

		// Select best by score then rating
		const best = scored.sort((a, b) => {
			if (b.breakdown.totalScore !== a.breakdown.totalScore) {
				return b.breakdown.totalScore - a.breakdown.totalScore
			}
			return normalizeRating(b.candidate.rating) - normalizeRating(a.candidate.rating)
		})[0]

		if (!best) return null

		return {
			enpId: String(best.candidate.id),
			enpName: best.candidate.name ?? "Electronic Notary Public",
			rating: best.candidate.rating ?? 0,
			totalSessions: best.candidate.reviewCount ?? 0,
			specializations: best.candidate.specialization
				? [best.candidate.specialization]
				: ["General"],
			availableTime: input.preferredTimeWindow ?? "Check availability",
			scoreBreakdown: best.breakdown,
		}
	}),

	/**
	 * Get available ENPs list (for Browse tab)
	 * Returns: filterable list of all active ENPs with scores
	 */
	getAvailableENPs: protectedProcedure
		.input(getAvailableENPsSchema)
		.query(async ({ ctx, input }) => {
			const { specialization, minRating, searchTerm, sortBy, limit, offset } = input

			// Build where conditions
			const baseConditions = [eq(users.role, "ENP"), eq(enpProfiles.isAvailable, true)]

			// Add specialization, rating, and search filters using utility function
			const filterConditions = buildENPWhereConditions({
				specialization,
				minRating,
				searchTerm,
			})
			const allConditions = [...baseConditions, ...filterConditions]

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
				.where(and(...allConditions))

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
				.where(and(...allConditions))
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

			// Transform data using utility function
			const mappedEnps = enpsData.map(transformENPData)

			const response: GetAvailableENPsResponse = {
				total: totalCount,
				enps: mappedEnps,
			}

			return response
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
		.input(trackQuickMatchResponseSchema)
		.mutation(async ({ input }) => {
			// TODO: Log response, apply penalties if needed:
			// - If DECLINED: apply -5% or -10% penalty to ENP score
			// - If TIMEOUT: auto-decline, apply penalty
			// - If ACCEPTED: create SessionRequest record

			void input

			return { success: true }
		}),
})

// Re-export normalizeRating for use in findBestMatch (needed inline)
function normalizeRating(r?: number | null) {
	return Math.min(Math.max((r ?? 0) / 5, 0), 1)
}
