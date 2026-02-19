import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, gte, inArray, lt, or } from "drizzle-orm"
import { z } from "zod/v4"

import { type db } from "@/services/drizzle/db"
import { appointmentParticipants } from "@/services/drizzle/schema/appointment-participants"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { enpAvailability, enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { sendNotarizationRequestNotification } from "@/services/react-email/lib/send.notarization-request"
import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom } from "@/services/video-sdk"

import { env } from "@/env"

import {
	blockTimeSlotSchema,
	cancelAppointmentSchema,
	confirmAppointmentSchema,
	createAppointmentSchema,
	createEnpEventSchema,
	createRequestSchema,
	deleteEnpEventSchema,
	getAppointmentByIdSchema,
	getAppointmentsSchema,
	getNotarizationSessionSchema,
	updateAppointmentSchema,
	updateEnpEventSchema,
	updateRequestStatusSchema,
} from "./appointments.schema"

// Type-safe enum constants
const BLOCKED = "BLOCKED" as const
const RECURRING_BLOCKED = "RECURRING_BLOCKED" as const

/**
 * Helper function to create a meeting for appointments
 * Extracts duplicated meeting creation logic for use in confirmAppointment and createEnpEvent procedures
 */
async function createMeetingForAppointment(
	ctx: { db: typeof db },
	createdById: string
): Promise<string> {
	const { roomId } = await createMeetingRoom()
	const [meeting] = await ctx.db
		.insert(meetings)
		.values({
			roomId,
			createdById,
		})
		.returning()

	if (!meeting) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create meeting room",
		})
	}

	return meeting.id
}

function computeLapsed(
	appointment: { status: string; appointmentDate: Date },
	now: number,
	graceMs: number
): boolean {
	return (
		appointment.status === "CONFIRMED" &&
		now > new Date(appointment.appointmentDate).getTime() + graceMs
	)
}

export const appointmentsRouter = createTRPCRouter({
	// =================== PRINCIPAL PROCEDURES ===================

	// Create new appointment
	createAppointment: protectedProcedure
		.input(createAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const principalId = ctx.session.user.id

			// Verify the ENP exists and has ENP role
			const enp = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
			})

			if (enp?.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "ENP not found",
				})
			}

			// Check if appointment date is in the future
			if (input.appointmentDate <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Appointment date must be in the future",
				})
			}

			// Runtime guard: IEN appointments must have a location
			if (input.modeOfNotarization === "IEN") {
				if (!input.location || input.location.trim().length === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Location is required for In-Person Electronic Notarization (IEN) appointments",
					})
				}
			}

			// Create appointment
			const [appointment] = await ctx.db
				.insert(appointments)
				.values({
					userId: input.enpId,
					title: input.title,
					description: input.description ?? null,
					type: input.type,
					appointmentDate: input.appointmentDate,
					duration: input.duration,
					modeOfNotarization: input.modeOfNotarization,
					location: input.location,
					status: "PENDING",
					color: "#F59E0B",
				})
				.returning()

			if (!appointment) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create appointment",
				})
			}

			await ctx.db.insert(appointmentParticipants).values([
				{
					appointmentId: appointment.id,
					userId: input.enpId,
					participantRole: "HOST",
					status: "ACCEPTED",
				},
				{
					appointmentId: appointment.id,
					userId: principalId,
					participantRole: "PARTICIPANT",
					status: "PENDING",
				},
			])

			return appointment
		}),

	// Get user's appointments (both as client and lawyer)
	getMyAppointments: protectedProcedure
		.input(getAppointmentsSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { status, type, limit, offset } = input

			// Build where conditions
			const whereConditions = [
				inArray(
					appointments.id,
					ctx.db
						.select({ id: appointmentParticipants.appointmentId })
						.from(appointmentParticipants)
						.where(eq(appointmentParticipants.userId, userId))
				),
			]

			if (status) {
				whereConditions.push(eq(appointments.status, status))
			}

			if (type) {
				whereConditions.push(eq(appointments.type, type))
			}

			// Fetch appointments with related user data
			const results = await ctx.db.query.appointments.findMany({
				where: and(...whereConditions),
				orderBy: [desc(appointments.appointmentDate)],
				limit,
				offset,
				with: {
					createdBy: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
									phoneNumber: true,
								},
							},
						},
					},
				},
			})

			return results
		}),

	// Create a new notarization request
	createRequest: protectedProcedure.input(createRequestSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id

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

		// Create the request
		const [request] = await ctx.db
			.insert(notarizationRequests)
			.values({
				principalId: userId,
				enpId: input.enpId,
				title: input.title,
				description: input.description,
				workflow: input.workflow,
				priority: input.priority,
				status: "PENDING",
			})
			.returning()

		if (!request) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create notarization request - no record returned",
			})
		}

		// Fetch with relations to send email notification
		const requestWithRelations = await ctx.db.query.notarizationRequests.findFirst({
			where: eq(notarizationRequests.id, request.id),
			with: {
				enp: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				principal: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		// Send email notification to ENP
		if (requestWithRelations?.enp?.email && requestWithRelations?.principalId) {
			try {
				const requestUrl = `${env.NEXT_PUBLIC_SITE_URL ?? ""}/requests`
				await sendNotarizationRequestNotification({
					enpEmail: requestWithRelations.enp.email,
					enpName: requestWithRelations.enp.name ?? "Unknown",
					principalName: requestWithRelations.principal?.name ?? "Unknown",
					requestTitle: input.title,
					requestDescription: input.description,
					workflow: input.workflow,
					priority: input.priority,
					requestUrl,
				})
			} catch (error) {
				console.error("Failed to send notification email:", error)
				// Don't fail the request creation if email fails
			}
		}

		return requestWithRelations
	}),

	// Get my requests (requests created by current user as principal)
	getMyRequests: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const myRequests = await ctx.db.query.notarizationRequests.findMany({
			where: eq(notarizationRequests.principalId, userId),
			orderBy: [desc(notarizationRequests.createdAt)],
			with: {
				enp: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		// Get document counts for each request
		const requestsWithCounts = myRequests.map(request => ({
			...request,
			documents: 0, // Documents are uploaded separately after request is created
		}))

		return requestsWithCounts
	}),

	// Get request by ID
	getRequestById: protectedProcedure
		.input(z.object({ requestId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const request = await ctx.db.query.notarizationRequests.findFirst({
				where: eq(notarizationRequests.id, input.requestId),
				with: {
					enp: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					principal: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarization request not found",
				})
			}

			// Check permissions
			if (request.principalId !== userId && request.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this request",
				})
			}

			return request
		}),

	// =================== ENP PROCEDURES ===================

	// Get incoming requests (requests received by current user as ENP)
	getIncomingRequests: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			return []
		}

		const incomingRequests = await ctx.db.query.notarizationRequests.findMany({
			where: eq(notarizationRequests.enpId, userId),
			orderBy: [desc(notarizationRequests.createdAt)],
			with: {
				principal: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		return incomingRequests
	}),

	// Get incoming appointments (appointments received by current user as ENP)
	getIncomingAppointmentsForENP: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			return []
		}

		// Get pending and confirmed appointments for this ENP
		const incomingAppointments = await ctx.db.query.appointments.findMany({
			where: and(
				eq(appointments.userId, userId),
				or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED")),
				gte(appointments.appointmentDate, new Date()) // Only upcoming appointments
			),
			orderBy: [asc(appointments.appointmentDate)],
			with: {
				participants: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
					},
				},
			},
		})

		// Map appointments to same structure as requests for consistency
		// We'll use a 'source' field to distinguish between requests and appointments
		const appointmentsAsRequests = incomingAppointments.map(apt => {
			const participant = apt.participants.find(p => p.participantRole === "PARTICIPANT")

			return {
				id: apt.id,
				title: apt.title,
				description: apt.description,
				status: apt.status,
				workflow: (apt.modeOfNotarization ?? "REN") as "REN" | "IEN",
				priority: "NORMAL" as const,
				createdAt: apt.createdAt,
				updatedAt: apt.updatedAt,
				enpId: apt.userId,
				principalId: participant?.userId ?? "",
				appointmentId: apt.id, // Link back to appointment
				rejectReason: apt.cancelReason,
				principal: {
					name: participant?.user?.name,
					image: participant?.user?.image,
				},
				documents: 0,
				source: "appointment" as const, // Mark as coming from appointment
				appointmentData: { ...apt, lapsed: false }, // Keep full appointment data for actions
			}
		})

		return appointmentsAsRequests
	}),

	// Update request status
	updateRequestStatus: protectedProcedure
		.input(updateRequestStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const request = await ctx.db.query.notarizationRequests.findFirst({
				where: eq(notarizationRequests.id, input.requestId),
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Request not found",
				})
			}

			// Check permissions - principal and ENP can update
			if (request.principalId !== userId && request.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this request",
				})
			}

			const [updatedRequest] = await ctx.db
				.update(notarizationRequests)
				.set({
					status: input.status,
					rejectReason: input.rejectReason,
					updatedAt: new Date(),
				})
				.where(eq(notarizationRequests.id, input.requestId))
				.returning()

			if (!updatedRequest) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Request not found",
				})
			}

			return updatedRequest
		}),

	// Confirm appointment (lawyer only)
	confirmAppointment: protectedProcedure
		.input(confirmAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Get existing appointment
			const existing = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Appointment not found",
				})
			}

			const hostParticipant = await ctx.db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, input.appointmentId),
					eq(appointmentParticipants.userId, userId),
					eq(appointmentParticipants.participantRole, "HOST")
				),
			})

			if (!hostParticipant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the host can confirm this appointment",
				})
			}

			// Determine if this is a remote appointment using workflow flag instead of location
			const isRemote = existing.modeOfNotarization === "REN"
			let meetingId: string | null = null

			// For remote (REN) appointments without a meeting yet, create one on accept
			if (isRemote && !existing.meetingId) {
				try {
					meetingId = await createMeetingForAppointment(ctx, userId)
				} catch (error) {
					console.error("Failed to create meeting on confirmation:", error)
				}
			}

			// Update appointment
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					status: "CONFIRMED",
					color: "#10B981",
					meetingId: meetingId ?? existing.meetingId ?? null,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.appointmentId))
				.returning()

			return updated
		}),

	// Cancel appointment
	cancelAppointment: protectedProcedure
		.input(cancelAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Get existing appointment
			const existing = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Appointment not found",
				})
			}

			const participant = await ctx.db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, input.appointmentId),
					eq(appointmentParticipants.userId, userId)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to cancel this appointment",
				})
			}

			// Update appointment
			const [cancelled] = await ctx.db
				.update(appointments)
				.set({
					status: "CANCELLED",
					color: "#EF4444",
					cancelReason: input.cancelReason,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.appointmentId))
				.returning()

			return cancelled
		}),

	// Update appointment
	updateAppointment: protectedProcedure
		.input(updateAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { appointmentId, ...updates } = input
			const statusColorMap = {
				PENDING: "#F59E0B",
				CONFIRMED: "#10B981",
				ONGOING: "#3B82F6",
				CANCELLED: "#EF4444",
				COMPLETED: "#22C55E",
			} as const
			const color = updates.status ? statusColorMap[updates.status] : undefined

			// Get existing appointment
			const existing = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, appointmentId),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Appointment not found",
				})
			}

			const participant = await ctx.db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, appointmentId),
					eq(appointmentParticipants.userId, userId)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this appointment",
				})
			}

			// Update appointment
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					...updates,
					...(color ? { color } : {}),
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, appointmentId))
				.returning()

			return updated
		}),

	// Get appointment by ID
	getAppointmentById: protectedProcedure
		.input(getAppointmentByIdSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const appointment = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
				with: {
					createdBy: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
									phoneNumber: true,
								},
							},
						},
					},
				},
			})

			if (!appointment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Appointment not found",
				})
			}

			const participant = await ctx.db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, input.appointmentId),
					eq(appointmentParticipants.userId, userId)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this appointment",
				})
			}

			return appointment
		}),

	// Get upcoming appointments
	getUpcomingAppointments: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const now = new Date()

		const results = await ctx.db.query.appointments.findMany({
			where: and(
				inArray(
					appointments.id,
					ctx.db
						.select({ id: appointmentParticipants.appointmentId })
						.from(appointmentParticipants)
						.where(eq(appointmentParticipants.userId, userId))
				),
				gte(appointments.appointmentDate, now),
				or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))
			),
			orderBy: [appointments.appointmentDate],
			limit: 10,
			with: {
				createdBy: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				participants: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
					},
				},
			},
		})

		return results
	}),

	// Get notarization session data (works with appointment ID or notarization request ID)
	getNotarizationSession: protectedProcedure
		.input(getNotarizationSessionSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { sessionId } = input

			// Try to find as appointment first
			let appointment = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, sessionId),
				with: {
					createdBy: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
									phoneNumber: true,
								},
							},
						},
					},
				},
			})

			// If not found as appointment, try as notarization request
			let notarizationRequest = null
			if (!appointment) {
				notarizationRequest = await ctx.db.query.notarizationRequests.findFirst({
					where: eq(notarizationRequests.id, sessionId),
					with: {
						principal: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
								phoneNumber: true,
							},
						},
						enp: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
								phoneNumber: true,
							},
						},
						appointment: {
							with: {
								createdBy: {
									columns: {
										id: true,
										name: true,
										email: true,
										image: true,
									},
								},
								participants: {
									with: {
										user: {
											columns: {
												id: true,
												name: true,
												email: true,
												image: true,
												phoneNumber: true,
											},
										},
									},
								},
							},
						},
					},
				})

				// If request has an appointment, use that
				if (notarizationRequest?.appointment) {
					appointment = notarizationRequest.appointment
				}
			}

			// If neither found, throw error
			if (!appointment && !notarizationRequest) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarization session not found",
				})
			}

			// Determine principal and ENP
			const appointmentHost = appointment?.participants.find(
				participant => participant.participantRole === "HOST"
			)
			const appointmentPrincipal = appointment?.participants.find(
				participant => participant.participantRole === "PARTICIPANT"
			)
			const principal = appointment ? appointmentPrincipal?.user : notarizationRequest?.principal
			const enpUser = appointment ? appointmentHost?.user : notarizationRequest?.enp

			if (!principal || !enpUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Principal or ENP not found",
				})
			}

			// Check permissions
			if (principal.id !== userId && enpUser.id !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this session",
				})
			}

			// Get ENP profile
			const enpProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, enpUser.id),
			})

			// Get workflow (REN or IEN) - from notarization request if available, otherwise use appointment mode field
			const workflow = notarizationRequest
				? (notarizationRequest.workflow as "REN" | "IEN")
				: ((appointment?.modeOfNotarization ?? "REN") as "REN" | "IEN")

			// Get envelope associated with the appointment/request
			// For now, we'll look for envelopes created by the principal around the appointment time
			// In a real system, there might be a direct link between appointments and envelopes
			const envelope = await ctx.db.query.envelopes.findFirst({
				where: eq(envelopes.userId, principal.id),
				orderBy: [desc(envelopes.createdAt)],
			})

			// Get documents for the envelope
			let sessionDocuments: Array<{
				id: string
				name: string
				url: string
				status: string
				pages: number
			}> = []

			if (envelope) {
				const envelopeDocuments = await ctx.db
					.select()
					.from(documents)
					.where(eq(documents.envelopeId, envelope.id))

				// Get document URLs and determine page count
				sessionDocuments = await Promise.all(
					envelopeDocuments.map(async doc => {
						let docUrl = ""
						try {
							if (doc.path) {
								docUrl = await getDocumentPublicUrl(doc.path)
							}
						} catch (error) {
							console.error(`Failed to get URL for document ${doc.id}:`, error)
						}

						// For now, estimate pages based on file size (rough estimate: 1 page per 50KB)
						// In production, you'd parse the PDF to get actual page count
						const estimatedPages = Math.max(1, Math.floor(doc.size / 50000))

						return {
							id: doc.id,
							name: doc.name,
							url: docUrl,
							status: doc.status === "READY" ? "READY" : "PENDING_SIGNATURE",
							pages: estimatedPages,
						}
					})
				)
			}

			// Determine location
			const location =
				appointment?.location ?? (workflow === "REN" ? "Remote Video Call" : "In-Person")

			// Build response
			return {
				id: appointment?.id ?? notarizationRequest?.id ?? sessionId,
				envelopeId: envelope?.id ?? null,
				title: notarizationRequest?.title ?? envelope?.title ?? "Notarization Session",
				status: appointment?.status ?? notarizationRequest?.status ?? "PENDING",
				workflow,
				enp: {
					id: enpUser.id,
					name: enpUser.name ?? "Electronic Notary Public",
					title: enpProfile?.specialization ?? "Electronic Notary Public",
					avatar: enpUser.image ?? null,
					phone: enpUser.phoneNumber ?? null,
					email: enpUser.email ?? null,
				},
				principal: {
					id: principal.id,
					name: principal.name ?? "Principal",
					email: principal.email ?? null,
					phone: principal.phoneNumber ?? null,
				},
				documents: sessionDocuments,
				requirements: {
					identityVerified: false,
					documentsScanned: false,
					witnessPresent: false,
					videoRecording: false,
				},
				startTime: appointment?.appointmentDate?.toISOString() ?? new Date().toISOString(),
				estimatedDuration: appointment?.duration ?? 30,
				location,
			}
		}),

	// ENP Schedule Management

	// Get ENP's schedule including their own events
	getEnpSchedule: protectedProcedure
		.input(z.object({ month: z.number(), year: z.number() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access schedule",
				})
			}

			// Get regular weekly availability
			const regularAvailability = await ctx.db.query.enpAvailability.findMany({
				where: and(eq(enpAvailability.enpId, userId), eq(enpAvailability.type, "REGULAR")),
			})

			// Get one-time blocked slots
			const blockedSlots = await ctx.db.query.enpAvailability.findMany({
				where: and(eq(enpAvailability.enpId, userId), eq(enpAvailability.type, "BLOCKED")),
				orderBy: [asc(enpAvailability.date), asc(enpAvailability.startTime)],
			})

			// Get recurring blocked slots
			const recurringBlocked = await ctx.db.query.enpAvailability.findMany({
				where: and(
					eq(enpAvailability.enpId, userId),
					eq(enpAvailability.type, "RECURRING_BLOCKED")
				),
				orderBy: [asc(enpAvailability.dayOfWeek), asc(enpAvailability.startTime)],
			})

			// Get custom availability overrides for month
			const customAvailability = await ctx.db.query.enpAvailability.findMany({
				where: and(eq(enpAvailability.enpId, userId), eq(enpAvailability.type, "CUSTOM")),
				orderBy: [asc(enpAvailability.date), asc(enpAvailability.startTime)],
			})

			// Get ENP's appointments with lapsed status computation (inline getEnpScheduleWithEvents logic)
			const startDate = new Date(input.year, input.month, 1)
			const endDate = new Date(input.year, input.month + 1, 0, 0, -1) // Last day of month

			const myAppointments = await ctx.db.query.appointments.findMany({
				where: and(
					eq(appointments.userId, userId),
					or(eq(appointments.status, "CONFIRMED"), eq(appointments.status, "PENDING")),
					gte(appointments.appointmentDate, startDate),
					lt(appointments.appointmentDate, endDate)
				),
				orderBy: [asc(appointments.appointmentDate)],
				with: {
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			})

			// Compute lapsed status for each appointment
			const now = Date.now()
			const graceMs = 30 * 60 * 1000

			const myAppointmentsWithLapsed = myAppointments.map(appointment => {
				return {
					...appointment,
					lapsed: computeLapsed(appointment, now, graceMs),
				}
			})

			return {
				regular: regularAvailability,
				blocked: blockedSlots,
				recurringBlocked,
				custom: customAvailability,
				myAppointments: myAppointmentsWithLapsed,
			}
		}),

	// Get ENP's schedule with their events - FIXED TIMEZONE ISSUE
	getEnpScheduleWithEvents: protectedProcedure
		.input(z.object({ month: z.number(), year: z.number() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access schedule",
				})
			}

			// Get ENP's appointments (all appointments where ENP is lawyer) - timezone-safe approach
			const startDate = new Date(input.year, input.month, 1)
			const endDate = new Date(input.year, input.month + 1, 0, 0, -1) // Last day of month

			const myAppointments = await ctx.db.query.appointments.findMany({
				where: and(
					eq(appointments.userId, userId),
					or(eq(appointments.status, "CONFIRMED"), eq(appointments.status, "PENDING")),
					gte(appointments.appointmentDate, startDate),
					lt(appointments.appointmentDate, endDate)
				),
				orderBy: [asc(appointments.appointmentDate)],
				with: {
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			})

			const now = Date.now()
			const graceMs = 30 * 60 * 1000

			const myAppointmentsWithLapsed = myAppointments.map(appointment => {
				return {
					...appointment,
					lapsed: computeLapsed(appointment, now, graceMs),
				}
			})

			return {
				myAppointments: myAppointmentsWithLapsed,
			}
		}),

	// Create ENP event (consultation or notarization)
	createEnpEvent: protectedProcedure
		.input(createEnpEventSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Parse appointment date with time
			const appointmentDateTime = new Date(input.appointmentDate)
			if (input.startTime) {
				const timeParts = input.startTime.split(":").map(Number)
				const hours = timeParts[0] ?? 9
				const minutes = timeParts[1] ?? 0
				appointmentDateTime.setHours(hours, minutes, 0, 0)
			} else {
				// Default to start of day for all-day events
				appointmentDateTime.setHours(9, 0, 0, 0)
			}

			// Calculate duration or end time
			let duration = input.duration
			if (input.endTime && !duration) {
				const endTimeParts = input.endTime.split(":").map(Number)
				const endHours = endTimeParts[0] ?? 0
				const endMinutes = endTimeParts[1] ?? 0
				const endTimeDate = new Date(appointmentDateTime)
				endTimeDate.setHours(endHours, endMinutes, 0, 0)
				duration = Math.round((endTimeDate.getTime() - appointmentDateTime.getTime()) / (60 * 1000))
			}

			// Determine if this is a remote appointment (REN or consultation without location)
			const isRemote =
				input.workflow === "REN" || (input.type === "CONSULTATION" && !input.location)

			// Generate meeting link for remote appointments
			let meetingId: string | null = null
			if (isRemote) {
				try {
					meetingId = await createMeetingForAppointment(ctx, userId)
				} catch (error) {
					console.error("Failed to create meeting for ENP event:", error)
					// Continue without meeting link - appointment still created
				}
			}

			// Create self-appointment for ENP
			const [appointment] = await ctx.db
				.insert(appointments)
				.values({
					userId,
					title: input.title,
					description: input.description ?? null,
					type: input.type,
					appointmentDate: appointmentDateTime,
					duration: duration ?? 60,
					modeOfNotarization: input.workflow ?? "REN",
					location:
						input.type === "NOTARIZATION" && input.workflow === "IEN"
							? (input.location ?? undefined)
							: null,
					meetingId,
					status: "CONFIRMED", // ENP-created events are auto-confirmed
					color: "#10B981",
				})
				.returning()

			if (!appointment) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create appointment",
				})
			}

			await ctx.db.insert(appointmentParticipants).values({
				appointmentId: appointment.id,
				userId,
				participantRole: "HOST",
				status: "ACCEPTED",
			})

			return appointment
		}),

	// Update existing ENP event
	updateEnpEvent: protectedProcedure
		.input(updateEnpEventSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const existing = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				})
			}

			// Check ownership (ENP can only update their own events)
			if (existing.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only update your own events",
				})
			}

			// Parse appointment date with time
			const appointmentDateTime = input.appointmentDate
				? new Date(input.appointmentDate)
				: existing.appointmentDate

			if (input.startTime) {
				const timeParts = input.startTime.split(":").map(Number)
				const hours = timeParts[0] ?? 9
				const minutes = timeParts[1] ?? 0
				appointmentDateTime.setHours(hours, minutes, 0, 0)
			}

			// Calculate duration or use existing
			let duration = input.duration ?? existing.duration
			if (input.endTime && !input.duration) {
				const endTimeParts = input.endTime.split(":").map(Number)
				const endHours = endTimeParts[0] ?? 0
				const endMinutes = endTimeParts[1] ?? 0
				const endTimeDate = new Date(appointmentDateTime)
				endTimeDate.setHours(endHours, endMinutes, 0, 0)
				duration = Math.round((endTimeDate.getTime() - appointmentDateTime.getTime()) / (60 * 1000))
			}

			// Resolve type and workflow, preferring input values over existing ones
			const eventType = input.type ?? existing.type
			const eventWorkflow = input.workflow ?? existing.modeOfNotarization

			const [updated] = await ctx.db
				.update(appointments)
				.set({
					title: input.title ?? existing.title,
					description: input.description ?? existing.description,
					type: input.type ?? existing.type,
					appointmentDate: appointmentDateTime,
					duration,
					modeOfNotarization: input.workflow ?? existing.modeOfNotarization,
					location:
						eventType === "NOTARIZATION" && eventWorkflow === "IEN"
							? (input.location ?? existing.location)
							: eventType === "CONSULTATION" && eventWorkflow === "REN"
								? null
								: existing.location,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.appointmentId))
				.returning()

			return updated
		}),

	// Delete ENP event
	deleteEnpEvent: protectedProcedure
		.input(deleteEnpEventSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const existing = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
			})

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				})
			}

			// Check ownership (ENP can only delete their own events)
			if (existing.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete your own events",
				})
			}

			await ctx.db.delete(appointments).where(eq(appointments.id, input.appointmentId))

			return { success: true }
		}),

	// Block/unblock time slot
	blockTimeSlot: protectedProcedure.input(blockTimeSlotSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id

		// Verify user is ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can manage their schedule",
			})
		}

		// Create blocked slot entry based on type
		if (input.type === "ONE_TIME") {
			// Validate date is provided for one-time blocks
			if (!input.date) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Date is required for one-time blocks",
				})
			}

			// Create BLOCKED entry
			await ctx.db.insert(enpAvailability).values({
				enpId: userId,
				type: BLOCKED,
				date: input.date,
				dayOfWeek: new Date(input.date).getDay(),
				startTime: input.startTime,
				endTime: input.endTime,
				reason: input.reason,
			})
		} else if (input.type === "RECURRING") {
			// For recurring blocks
			const days = input.dayOfWeek !== undefined ? [input.dayOfWeek] : [0, 1, 2, 3, 4, 5, 6] // All days

			// Create RECURRING_BLOCKED entries for each selected day
			const entries = days.map(day => ({
				enpId: userId,
				type: RECURRING_BLOCKED,
				dayOfWeek: day,
				startTime: input.startTime,
				endTime: input.endTime,
				reason: input.reason ?? "Recurring blocked time",
			}))

			await ctx.db.insert(enpAvailability).values(entries)
		}

		return {
			success: true,
			message:
				input.type === "ONE_TIME"
					? "Time slot blocked successfully"
					: "Recurring time block created successfully",
		}
	}),

	// Unblock time slot
	unblockTimeSlot: protectedProcedure
		.input(z.object({ availabilityId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can manage their schedule",
				})
			}

			// Verify slot belongs to user
			const slot = await ctx.db.query.enpAvailability.findFirst({
				where: eq(enpAvailability.id, input.availabilityId),
			})

			if (slot?.enpId !== userId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Availability slot not found",
				})
			}

			await ctx.db.delete(enpAvailability).where(eq(enpAvailability.id, input.availabilityId))

			return {
				success: true,
				message: "Time slot unblocked successfully",
			}
		}),
})
