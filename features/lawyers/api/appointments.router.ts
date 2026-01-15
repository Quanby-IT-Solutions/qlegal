import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, or } from "drizzle-orm"

import { getUrl } from "@/core/lib/get-url"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom } from "@/services/video-sdk"

import {
	cancelAppointmentSchema,
	confirmAppointmentSchema,
	createAppointmentSchema,
	getAppointmentByIdSchema,
	getAppointmentsSchema,
	getNotarizationSessionSchema,
	updateAppointmentSchema,
} from "./appointments.schema"

export const appointmentsRouter = createTRPCRouter({
	// Create new appointment
	createAppointment: protectedProcedure
		.input(createAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const clientId = ctx.session.user.id

			// Verify the lawyer exists and has ENP role
			const lawyer = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.lawyerId),
			})

			if (lawyer?.role !== "ENP") {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Lawyer not found",
				})
			}

			// Check if appointment date is in the future
			if (input.appointmentDate <= new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Appointment date must be in the future",
				})
			}

			// Create appointment
			const [appointment] = await ctx.db
				.insert(appointments)
				.values({
					clientId,
					lawyerId: input.lawyerId,
					type: input.type,
					appointmentDate: input.appointmentDate,
					duration: input.duration,
					notes: input.notes,
					location: input.location,
					meetingLink: input.meetingLink,
					status: "PENDING",
				})
				.returning()

			return appointment
		}),

	// Get user's appointments (both as client and lawyer)
	getMyAppointments: protectedProcedure
		.input(getAppointmentsSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { status, type, lawyerId, limit, offset } = input

			// Build where conditions
			const whereConditions = [
				or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId))!,
			]

			if (status) {
				whereConditions.push(eq(appointments.status, status))
			}

			if (type) {
				whereConditions.push(eq(appointments.type, type))
			}

			if (lawyerId) {
				whereConditions.push(eq(appointments.lawyerId, lawyerId))
			}

			// Fetch appointments with related user data
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

			return results
		}),

	// Get appointment by ID
	getAppointmentById: protectedProcedure
		.input(getAppointmentByIdSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const appointment = await ctx.db.query.appointments.findFirst({
				where: eq(appointments.id, input.appointmentId),
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

			if (!appointment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Appointment not found",
				})
			}

			// Check if user is part of this appointment
			if (appointment.clientId !== userId && appointment.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this appointment",
				})
			}

			return appointment
		}),

	// Update appointment
	updateAppointment: protectedProcedure
		.input(updateAppointmentSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { appointmentId, ...updates } = input

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

			// Check if user is the client or lawyer
			if (existing.clientId !== userId && existing.lawyerId !== userId) {
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
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, appointmentId))
				.returning()

			return updated
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

			// Check if user is the lawyer
			if (existing.lawyerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the lawyer can confirm this appointment",
				})
			}

			const isRemote = !existing.location // location null/undefined => remote
			const providedLink =
				input.meetingLink && input.meetingLink.trim().length > 0 ? input.meetingLink : undefined
			let meetingLink = providedLink ?? existing.meetingLink

			// For remote appointments without a meeting yet, create one on accept
			// IMPORTANT: Set client (PRINCIPAL) as meeting creator, not ENP
			// This matches manually created meetings where the uploader is the creator
			// This ensures DocoChain projects use the PRINCIPAL's email as creator
			if (isRemote && !meetingLink) {
				try {
					const { roomId } = await createMeetingRoom()
					const [meeting] = await ctx.db
						.insert(meetings)
						.values({
							title:
								existing.type === "DOCUMENT_SIGNING"
									? "Document Signing Session"
									: "Consultation Meeting",
							roomId,
							createdById: existing.clientId, // Use client (PRINCIPAL) as creator, not ENP
							createdAt: existing.appointmentDate,
							updatedAt: existing.appointmentDate,
						})
						.returning()

					if (meeting) {
						await ctx.db.insert(meetingParticipants).values([
							{ meetingId: meeting.id, userId: existing.clientId },
							{ meetingId: meeting.id, userId: existing.lawyerId },
						])

						meetingLink = `${getUrl()}/meetings/${meeting.id}`
					}
				} catch (error) {
					console.error("Failed to create meeting on confirmation:", error)
				}
			}

			// Update appointment
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					status: "CONFIRMED",
					meetingLink: meetingLink ?? existing.meetingLink ?? providedLink ?? "",
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

			// Check if user is part of this appointment
			if (existing.clientId !== userId && existing.lawyerId !== userId) {
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
					cancelReason: input.cancelReason,
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, input.appointmentId))
				.returning()

			return cancelled
		}),

	// Get upcoming appointments
	getUpcomingAppointments: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const now = new Date()

		const results = await ctx.db.query.appointments.findMany({
			where: and(
				or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId)),
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
			const principal = appointment ? appointment.client : notarizationRequest?.principal
			const enpUser = appointment ? appointment.lawyer : notarizationRequest?.enp

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

			// Get workflow (REN or IEN) - from notarization request if available, otherwise infer from appointment
			const workflow = notarizationRequest
				? (notarizationRequest.workflow as "REN" | "IEN")
				: appointment?.meetingLink
					? ("REN" as const)
					: ("IEN" as const)

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
})
