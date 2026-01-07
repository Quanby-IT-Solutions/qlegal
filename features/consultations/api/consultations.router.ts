import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { appointments } from "@/services/drizzle/schema/appointments"
import { conversations, conversationParticipants, messages } from "@/services/drizzle/schema/messages"
import { meetings, meetingParticipants } from "@/services/drizzle/schema/meetings"
import { createMeetingRoom, generateMeetingToken } from "@/services/video-sdk"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { env } from "@/env"

import {
	bookConsultationSchema,
	cancelConsultationSchema,
	getAvailableEnpsSchema,
	getConsultationByIdSchema,
	getConsultationsSchema,
	getEnpAvailabilitySchema,
	setEnpAvailabilitySchema,
	updateConsultationSchema,
} from "./consultations.schema"

export const consultationsRouter = createTRPCRouter({
	// Book a new consultation
	bookConsultation: protectedProcedure
		.input(bookConsultationSchema)
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
					notes: consultationNotes,
					location: input.workflowType === "IEN" ? input.location ?? "To be confirmed" : null,
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
				meetingPreference: input.meetingPreference ?? (input.workflowType === "REN" ? "VIDEO_CALL" : undefined),
			}
		}),

	// Get user's consultations
	getMyConsultations: protectedProcedure
		.input(getConsultationsSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { status, workflowType, limit, offset } = input

			// Build where conditions
			const whereConditions = [
				and(
					or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId)),
					eq(appointments.type, "CONSULTATION")
				)!,
			]

			if (status) {
				whereConditions.push(eq(appointments.status, status))
			}

			// Fetch consultations with related user data
			const results = await ctx.db.query.appointments.findMany({
				where: and(...whereConditions),
				orderBy: [desc(appointments.appointmentDate)],
				limit,
				offset,
				with: {
					client: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
							phoneNumber: true,
						},
					},
					lawyer: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
							phoneNumber: true,
						},
					},
				},
			})

			// Filter by workflow type if specified (from notes)
			let filteredResults = results
			if (workflowType) {
				filteredResults = results.filter((r) =>
					r.notes?.includes(`Workflow: ${workflowType === "REN" ? "Remote" : "In-Person"}`)
				)
			}

			return filteredResults
		}),

	// Get consultation by ID
	getConsultationById: protectedProcedure
		.input(getConsultationByIdSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const consultation = await ctx.db.query.appointments.findFirst({
				where: and(eq(appointments.id, input.consultationId), eq(appointments.type, "CONSULTATION")),
				with: {
					client: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
							phoneNumber: true,
						},
					},
					lawyer: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
							phoneNumber: true,
						},
					},
				},
			})

			if (!consultation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Consultation not found",
				})
			}

			// Check if user is part of this consultation
			if (consultation.clientId !== userId && consultation.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this consultation",
				})
			}

			return consultation
		}),

	// Update consultation
	updateConsultation: protectedProcedure
		.input(updateConsultationSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { consultationId, ...updates } = input

			// Get existing consultation
			const existing = await ctx.db.query.appointments.findFirst({
				where: and(eq(appointments.id, consultationId), eq(appointments.type, "CONSULTATION")),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Consultation not found",
				})
			}

			// Check if user is the client or ENP
			if (existing.clientId !== userId && existing.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this consultation",
				})
			}

			// Update consultation
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					...updates,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, consultationId))
				.returning()

			return updated
		}),

	// Cancel consultation
	cancelConsultation: protectedProcedure
		.input(cancelConsultationSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Get existing consultation
			const existing = await ctx.db.query.appointments.findFirst({
				where: and(eq(appointments.id, input.consultationId), eq(appointments.type, "CONSULTATION")),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Consultation not found",
				})
			}

			// Check if user is part of this consultation
			if (existing.clientId !== userId && existing.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to cancel this consultation",
				})
			}

			// Update consultation
			const [cancelled] = await ctx.db
				.update(appointments)
				.set({
					status: "CANCELLED",
					cancelReason: input.cancelReason,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.consultationId))
				.returning()

			return cancelled
		}),

	// Get upcoming consultations
	getUpcomingConsultations: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const now = new Date()

		const results = await ctx.db.query.appointments.findMany({
			where: and(
				or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId)),
				eq(appointments.type, "CONSULTATION"),
				gte(appointments.appointmentDate, now),
				or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))
			),
			orderBy: [appointments.appointmentDate],
			limit: 10,
			with: {
				client: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				lawyer: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		return results
	}),

	// Get ENP availability
	getEnpAvailability: protectedProcedure
		.input(getEnpAvailabilitySchema)
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
				const dayAvailability = enp.enpAvailability?.filter(
					(avail) => avail.dayOfWeek === dayOfWeek && avail.isAvailable
				) || []

				// If no custom availability set, use default office hours
				const timeSlots = dayAvailability.length > 0
					? dayAvailability.flatMap((avail) => {
						const slots = []
						const [startHour, startMin] = avail.startTime.split(":").map(Number)
						const [endHour, endMin] = avail.endTime.split(":").map(Number)
						
						let currentHour = startHour ?? 0
						let currentMin = startMin ?? 0
						
						while (currentHour < (endHour ?? 0) || (currentHour === (endHour ?? 0) && currentMin < (endMin ?? 0))) {
							slots.push(`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`)
							currentMin += 60 // 1-hour slots
							if (currentMin >= 60) {
								currentHour++
								currentMin = 0
							}
						}
						return slots
					})
					: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"] // Default office hours

				for (const time of timeSlots) {
					const [hours, minutes] = time.split(":").map(Number)
					const slotDate = new Date(date)
					slotDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)

					// Check if slot is already booked
					const isBooked = existingAppointments.some((apt) => {
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

	// Get available ENPs
	getAvailableEnps: protectedProcedure
		.input(getAvailableEnpsSchema)
		.query(async ({ ctx, input }) => {
			// Get all ENPs with their profiles
			const enps = await ctx.db.query.users.findMany({
				where: eq(users.role, "ENP"),
				columns: {
					id: true,
					name: true,
					email: true,
					image: true,
					phoneNumber: true,
				},
				with: {
					enpProfile: true,
				},
			})

			// Map ENPs with their profile data
			return enps
				.filter((enp) => enp.enpProfile?.isAvailable !== false) // Only show available ENPs
				.map((enp) => ({
					id: enp.id,
					name: enp.name,
					email: enp.email,
					image: enp.image,
					phoneNumber: enp.phoneNumber,
					specialization: enp.enpProfile?.specialization ?? "Legal Services",
					rating: enp.enpProfile?.rating ?? 0,
					reviewCount: enp.enpProfile?.reviewCount ?? 0,
					experience: enp.enpProfile?.experience ?? "Experienced",
					languages: (() => {
						const raw = enp.enpProfile?.languages
						if (!raw) return ["English"]
						try {
							const parsed = JSON.parse(raw) as unknown
							if (Array.isArray(parsed)) {
								return parsed.map((lang) => String(lang))
							}
							return ["English"]
						} catch {
							return ["English"]
						}
					})(),
					responseTime: enp.enpProfile?.responseTime ?? "Within 24 hours",
				}))
		}),

	// Confirm consultation (ENP only) - creates meeting if REN
	confirmConsultation: protectedProcedure
		.input(
			getConsultationByIdSchema.extend({
				meetingLink: bookConsultationSchema.shape.location.optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Get existing consultation
			const existing = await ctx.db.query.appointments.findFirst({
				where: and(eq(appointments.id, input.consultationId), eq(appointments.type, "CONSULTATION")),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Consultation not found",
				})
			}

			// Check if user is the ENP
			if (existing.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the ENP can confirm this consultation",
				})
			}

			const isRemote = existing.location === null || existing.location === undefined
			const prefersChatOnly = (existing.notes ?? "").toLowerCase().includes("chat only")

			let meetingLink = existing.meetingLink

			// Create meeting on confirm if remote + not chat-only and no link yet
			if (isRemote && !prefersChatOnly && !meetingLink) {
				try {
					const { roomId: videoRoomId } = await createMeetingRoom()
					const [meeting] = await ctx.db
						.insert(meetings)
						.values({
							title: `Consultation with ${existing.lawyerId === userId ? "Client" : "ENP"}`,
							roomId: videoRoomId,
							createdById: userId,
						})
						.returning()

					if (meeting) {
						// Add both client and ENP as participants
						await ctx.db.insert(meetingParticipants).values([
							{
								meetingId: meeting.id,
								userId: existing.clientId,
							},
							{
								meetingId: meeting.id,
								userId: existing.lawyerId,
							},
						])

						meetingLink = `${env.NEXT_PUBLIC_APP_URL ?? ""}/meetings/${meeting.id}`
					}
				} catch (error) {
					console.error("Failed to create meeting on confirmation:", error)
				}
			}

			// Create conversation on confirm (one-time best effort)
			try {
				const [conversation] = await ctx.db.insert(conversations).values({}).returning()
				if (conversation) {
					await ctx.db.insert(conversationParticipants).values([
						{
							conversationId: conversation.id,
							userId: existing.clientId,
						},
						{
							conversationId: conversation.id,
							userId: existing.lawyerId,
						},
					])
				}
			} catch (error) {
				console.error("Failed to create conversation on confirmation:", error)
			}

			// Update consultation
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					status: "CONFIRMED",
					meetingLink: input.meetingLink ?? meetingLink ?? existing.meetingLink,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.consultationId))
				.returning()

			return updated
		}),
})

