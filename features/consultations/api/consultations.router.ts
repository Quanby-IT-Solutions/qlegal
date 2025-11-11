import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { appointments } from "@/services/drizzle/schema/appointments"
import { conversations, conversationParticipants } from "@/services/drizzle/schema/messages"
import { meetings, meetingParticipants } from "@/services/drizzle/schema/meetings"
import { createMeetingRoom, generateMeetingToken } from "@/services/video-sdk"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

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

			if (!enp || enp.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Electronic Notary Public not found",
				})
			}

			// Parse appointment time and create full date
			const [hours, minutes] = input.appointmentTime.split(":").map(Number)
			const appointmentDateTime = new Date(input.appointmentDate)
			appointmentDateTime.setHours(hours || 0, minutes || 0, 0, 0)

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
					location: input.workflowType === "IEN" ? input.location || "To be confirmed" : null,
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

			// For REN consultations, create a meeting room only if VIDEO_CALL is preferred
			let meetingId: string | null = null
			let roomId: string | null = null
			const shouldCreateVideoMeeting = 
				input.workflowType === "REN" && 
				(!input.meetingPreference || input.meetingPreference === "VIDEO_CALL")
			
			if (shouldCreateVideoMeeting) {
				try {
					// Create VideoSDK room
					const { roomId: videoRoomId } = await createMeetingRoom()

					// Create meeting in database
					const [meeting] = await ctx.db
						.insert(meetings)
						.values({
							title: `Consultation with ${enp.name}`,
							roomId: videoRoomId,
							createdById: clientId,
						})
						.returning()

					if (meeting) {
						meetingId = meeting.id
						roomId = videoRoomId

						// Add both client and ENP as participants
						await ctx.db.insert(meetingParticipants).values([
							{
								meetingId: meeting.id,
								userId: clientId,
							},
							{
								meetingId: meeting.id,
								userId: input.enpId,
							},
						])

						// Update appointment with meeting link
						const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL || ""}/meetings/${meeting.id}`
						await ctx.db
							.update(appointments)
							.set({ meetingLink })
							.where(eq(appointments.id, appointment.id))
					}
				} catch (error) {
					console.error("Failed to create meeting room:", error)
					// Continue without meeting - ENP can create it later
				}
			} else if (input.workflowType === "REN" && input.meetingPreference === "CHAT_ONLY") {
				// For chat-only, no video meeting needed
				// Conversation will be created below for messaging
			}

			// Create a conversation between client and ENP for messaging
			let conversationId: string | null = null
			
			try {
				// Check if conversation already exists
				const existingConversations = await ctx.db.query.conversationParticipants.findMany({
					where: eq(conversationParticipants.userId, clientId),
					with: {
						conversation: {
							with: {
								participants: true,
							},
						},
					},
				})

				const existingConversation = existingConversations.find((cp) => {
					const participants = cp.conversation.participants
					return (
						participants.length === 2 &&
						participants.some((p) => p.userId === input.enpId) &&
						participants.some((p) => p.userId === clientId)
					)
				})

				if (existingConversation) {
					conversationId = existingConversation.conversationId
				} else {
					// Create new conversation
					const [conversation] = await ctx.db.insert(conversations).values({}).returning()

					if (conversation) {
						conversationId = conversation.id

						// Add both users as participants
						await ctx.db.insert(conversationParticipants).values([
							{
								conversationId: conversation.id,
								userId: clientId,
							},
							{
								conversationId: conversation.id,
								userId: input.enpId,
							},
						])
					}
				}
			} catch (error) {
				console.error("Failed to create conversation:", error)
				// Continue without conversation
			}

			return {
				appointment,
				meetingId,
				roomId,
				conversationId,
				workflowType: input.workflowType,
				meetingPreference: input.meetingPreference || (input.workflowType === "REN" ? "VIDEO_CALL" : undefined),
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
					or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId))!,
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
				or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId))!,
				eq(appointments.type, "CONSULTATION"),
				gte(appointments.appointmentDate, now),
				or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))!
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

			if (!enp || enp.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Electronic Notary Public not found",
				})
			}

			// Get existing appointments for this ENP
			const existingAppointments = await ctx.db.query.appointments.findMany({
				where: and(
					eq(appointments.lawyerId, input.enpId),
					or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))!
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
						
						let currentHour = startHour || 0
						let currentMin = startMin || 0
						
						while (currentHour < (endHour || 0) || (currentHour === (endHour || 0) && currentMin < (endMin || 0))) {
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
					slotDate.setHours(hours || 0, minutes || 0, 0, 0)

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
					specialization: enp.enpProfile?.specialization || "Legal Services",
					rating: enp.enpProfile?.rating || 0,
					reviewCount: enp.enpProfile?.reviewCount || 0,
					experience: enp.enpProfile?.experience || "Experienced",
					languages: enp.enpProfile?.languages ? JSON.parse(enp.enpProfile.languages) : ["English"],
					responseTime: enp.enpProfile?.responseTime || "Within 24 hours",
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

			// Update consultation
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					status: "CONFIRMED",
					meetingLink: input.meetingLink || existing.meetingLink,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.consultationId))
				.returning()

			return updated
		}),
})

