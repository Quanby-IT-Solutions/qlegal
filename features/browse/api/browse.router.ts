import { TRPCError } from "@trpc/server"
import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm"
import { z } from "zod"

import { getUrl } from "@/core/lib/get-url"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import {
	conversationParticipants,
	conversations,
	meetingParticipants,
	meetings,
	messages,
} from "@/services/drizzle/schema/meetings"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom } from "@/services/video-sdk"

import {
	buildENPWhereConditions,
	computeENPScore,
	normalizeRating,
	transformENPData,
} from "../lib/browse.utils"
import {
	findBestMatchSchema,
	getAvailableENPsSchema,
	trackQuickMatchResponseSchema,
	type ENPCandidateWithScore,
	type GetAvailableENPsResponse,
} from "./browse.schema"

// Consulting booking schemas
export const consultationWorkflowType = z.enum(["REN", "IEN"])
export type ConsultationWorkflowType = z.infer<typeof consultationWorkflowType>

export const consultationType = z.enum(["INITIAL", "FOLLOWUP", "URGENT"])
export type ConsultationType = z.infer<typeof consultationType>

export const meetingPreference = z.enum(["VIDEO_CALL", "CHAT_ONLY"])
export type MeetingPreference = z.infer<typeof meetingPreference>

export const bookConsultationInputSchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	workflowType: consultationWorkflowType,
	appointmentDate: z.coerce.date({
		message: "Appointment date is required",
	}),
	appointmentTime: z.string().min(1, "Appointment time is required"),
	consultationType: consultationType.default("INITIAL"),
	meetingPreference: meetingPreference.optional(),
	specialRequirements: z.string().optional(),
	location: z.string().optional(),
})

export const getEnpAvailabilityInputSchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	workflowType: consultationWorkflowType,
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
})

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

			// Transform data using utility function (now async to convert avatar paths to URLs)
			const mappedEnps = await Promise.all(enpsData.map(transformENPData))

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

	// =================== Consultation Booking ===================

	// Book a new consultation
	bookConsultation: protectedProcedure
		.input(bookConsultationInputSchema)
		.mutation(async ({ ctx, input }) => {
			const clientId = ctx.session.user.id

			// Verify the ENP exists and has ENP role
			const enp = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
			})

			if (enp?.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Electronic Notary Public not found",
				})
			}

			// Parse appointment time and create full date
			const [hours, minutes] = input.appointmentTime.split(":").map(Number)
			const appointmentDateTime = new Date(input.appointmentDate)
			appointmentDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0)

			// Check if appointment date is in the future
			if (appointmentDateTime <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Appointment date must be in the future",
				})
			}

			// Determine duration based on workflow type
			const duration = input.workflowType === "REN" ? 30 : 45

			// Create consultation notes
			const consultationNotes = [
				`Consultation Type: ${input.consultationType}`,
				`Workflow: ${input.workflowType === "REN" ? "Remote Electronic Notarization" : "In-Person Electronic Notarization"}`,
				input.workflowType === "REN" && input.meetingPreference
					? `Meeting Preference: ${input.meetingPreference === "VIDEO_CALL" ? "Video Call" : "Chat Only"}`
					: "",
				input.specialRequirements ? `Special Requirements: ${input.specialRequirements}` : "",
			]
				.filter(Boolean)
				.join("\n")

			// Create appointment
			const [appointment] = await ctx.db
				.insert(appointments)
				.values({
					clientId,
					lawyerId: input.enpId,
					type: "CONSULTATION",
					appointmentDate: appointmentDateTime,
					duration,
					modeOfNotarization: input.workflowType,
					notes: consultationNotes,
					location: input.workflowType === "IEN" ? (input.location ?? "To be confirmed") : null,
					meetingLink: null, // Will be set when confirmed
					status: "PENDING",
				})
				.returning()

			if (!appointment) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create consultation",
				})
			}

			// Meeting and conversation are created after ENP confirms to ensure acceptance first

			return {
				appointment,
				meetingId: null,
				roomId: null,
				conversationId: null,
				workflowType: input.workflowType,
				meetingPreference:
					input.meetingPreference ?? (input.workflowType === "REN" ? "VIDEO_CALL" : undefined),
			}
		}),

	// Get ENP availability
	getEnpAvailability: protectedProcedure
		.input(getEnpAvailabilityInputSchema)
		.query(async ({ ctx, input }) => {
			// Verify ENP exists
			const enp = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
				with: {
					enpAvailability: true,
				},
			})

			if (enp?.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Electronic Notary Public not found",
				})
			}

			// Get existing appointments for this ENP
			const existingAppointments = await ctx.db.query.appointments.findMany({
				where: and(
					eq(appointments.lawyerId, input.enpId),
					or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))
				),
			})

			const slots = []
			const today = new Date()
			const duration = input.workflowType === "REN" ? 30 : 45

			// Generate slots for next 7 days based on ENP's availability settings
			for (let i = 1; i <= 7; i++) {
				const date = new Date(today)
				date.setDate(date.getDate() + i)
				const dayOfWeek = date.getDay()
				const dateStr = date.toISOString().split("T")[0]

				// Find availability for this day of week
				const dayAvailability =
					enp.enpAvailability?.filter(
						avail => avail.dayOfWeek === dayOfWeek && avail.isAvailable
					) || []

				// If no custom availability set, use default office hours
				const timeSlots =
					dayAvailability.length > 0
						? dayAvailability.flatMap(avail => {
								const slotsArray = []
								const [startHour, startMin] = avail.startTime.split(":").map(Number)
								const [endHour, endMin] = avail.endTime.split(":").map(Number)

								let currentHour = startHour ?? 0
								let currentMin = startMin ?? 0

								while (
									currentHour < (endHour ?? 0) ||
									(currentHour === (endHour ?? 0) && currentMin < (endMin ?? 0))
								) {
									slotsArray.push(
										`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`
									)
									currentMin += 60 // 1-hour slots
									if (currentMin >= 60) {
										currentHour++
										currentMin = 0
									}
								}
								return slotsArray
							})
						: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"] // Default office hours

				for (const time of timeSlots) {
					const [timeHours, timeMinutes] = time.split(":").map(Number)
					const slotDate = new Date(date)
					slotDate.setHours(timeHours ?? 0, timeMinutes ?? 0, 0, 0)

					// Check if slot is already booked
					const isBooked = existingAppointments.some(apt => {
						const aptDate = new Date(apt.appointmentDate)
						const diff = Math.abs(aptDate.getTime() - slotDate.getTime())
						return diff < 60 * 60 * 1000 // Within 1 hour
					})

					if (!isBooked) {
						slots.push({
							date: dateStr,
							time,
							duration,
							available: true,
						})
					}
				}
			}

			return slots
		}),

	// =================== ENP Profile Management ===================

	// Get ENP's own profile
	getMyProfile: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is ENP
		if (ctx.session.user.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can access this endpoint",
			})
		}

		const profile = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, userId),
		})

		return profile ?? null
	}),

	// Toggle overall availability status (online/offline)
	updateAvailability: protectedProcedure
		.input(
			z.object({
				available: z.boolean(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			if (ctx.session.user.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can update their availability status",
				})
			}

			// Check if profile exists
			const profile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, userId),
			})

			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "ENP profile not found. Please complete your profile first.",
				})
			}

			await ctx.db
				.update(enpProfiles)
				.set({ isAvailable: input.available, updatedAt: new Date() })
				.where(eq(enpProfiles.userId, userId))

			console.log(`[ENP Profile] ${ctx.session.user.name} set availability to: ${input.available}`)

			return { success: true, isAvailable: input.available }
		}),
})
