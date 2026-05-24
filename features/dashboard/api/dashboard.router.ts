import { and, count, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { getFullName } from "@/core/lib/utils"

import { appointmentParticipants } from "@/services/drizzle/schema/appointment-participants"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

export const dashboardRouter = createTRPCRouter({
	// Get dashboard statistics
	getStatistics: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const userRole = ctx.session.user.role

		// Get counts based on user role
		const isENP = userRole === "ENP"
		const principalSubquery = ctx.db
			.select({ id: appointmentParticipants.appointmentId })
			.from(appointmentParticipants)
			.where(eq(appointmentParticipants.userId, userId))
		const appointmentScope = isENP
			? eq(appointments.userId, userId)
			: inArray(appointments.id, principalSubquery)

		// Total appointments
		const [appointmentsResult] = await ctx.db
			.select({ count: count() })
			.from(appointments)
			.where(appointmentScope)

		// Pending appointments
		const [pendingAppointmentsResult] = await ctx.db
			.select({ count: count() })
			.from(appointments)
			.where(and(appointmentScope, eq(appointments.status, "PENDING")))

		// Total documents
		const [documentsResult] = await ctx.db
			.select({ count: count() })
			.from(documents)
			.innerJoin(envelopes, eq(documents.envelopeId, envelopes.id))
			.where(eq(envelopes.userId, userId))

		// Pending signature requests (for ENPs)
		let pendingSignatureRequests = 0
		if (isENP) {
			const [signatureRequestsResult] = await ctx.db
				.select({ count: count() })
				.from(signatureRequests)
				.where(and(eq(signatureRequests.signerId, userId), eq(signatureRequests.status, "PENDING")))
			pendingSignatureRequests = signatureRequestsResult?.count ?? 0
		}

		// Pending notarization requests (for ENPs)
		let pendingNotarizationRequests = 0
		if (isENP) {
			const [notarizationRequestsResult] = await ctx.db
				.select({ count: count() })
				.from(notarizationRequests)
				.where(
					and(eq(notarizationRequests.enpId, userId), eq(notarizationRequests.status, "PENDING"))
				)
			pendingNotarizationRequests = notarizationRequestsResult?.count ?? 0
		}

		// Total meetings
		const [meetingsResult] = await ctx.db
			.select({ count: count() })
			.from(meetings)
			.where(eq(meetings.createdById, userId))

		// Completed appointments
		const [completedAppointmentsResult] = await ctx.db
			.select({ count: count() })
			.from(appointments)
			.where(and(appointmentScope, eq(appointments.status, "COMPLETED")))

		return {
			totalAppointments: appointmentsResult?.count ?? 0,
			pendingAppointments: pendingAppointmentsResult?.count ?? 0,
			totalDocuments: documentsResult?.count ?? 0,
			pendingSignatureRequests,
			pendingNotarizationRequests,
			totalMeetings: meetingsResult?.count ?? 0,
			completedAppointments: completedAppointmentsResult?.count ?? 0,
		}
	}),

	// Get recent appointments
	getRecentAppointments: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(10).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const userRole = ctx.session.user.role
			const isENP = userRole === "ENP"
			const principalSubquery = ctx.db
				.select({ id: appointmentParticipants.appointmentId })
				.from(appointmentParticipants)
				.where(eq(appointmentParticipants.userId, userId))
			const appointmentScope = isENP
				? eq(appointments.userId, userId)
				: inArray(appointments.id, principalSubquery)

			const recentAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					title: appointments.title,
					description: appointments.description,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					location: appointments.location,
					createdAt: appointments.createdAt,
				})
				.from(appointments)
				.where(appointmentScope)
				.orderBy(desc(appointments.appointmentDate))
				.limit(input?.limit ?? 5)

			return recentAppointments
		}),

	// Get upcoming appointments
	getUpcomingAppointments: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(10).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const userRole = ctx.session.user.role
			const isENP = userRole === "ENP"
			const principalSubquery = ctx.db
				.select({ id: appointmentParticipants.appointmentId })
				.from(appointmentParticipants)
				.where(eq(appointmentParticipants.userId, userId))
			const appointmentScope = isENP
				? eq(appointments.userId, userId)
				: inArray(appointments.id, principalSubquery)

			const now = new Date()

			const upcomingAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					title: appointments.title,
					description: appointments.description,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					location: appointments.location,
					createdAt: appointments.createdAt,
				})
				.from(appointments)
				.where(
					and(
						appointmentScope,
						gte(appointments.appointmentDate, now),
						or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))
					)
				)
				.orderBy(appointments.appointmentDate)
				.limit(input?.limit ?? 5)

			return upcomingAppointments
		}),

	// Get recent documents
	getRecentDocuments: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(10).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const recentDocuments = await ctx.db
				.select({
					id: documents.id,
					name: documents.name,
					type: documents.type,
					size: documents.size,
					status: documents.status,
					createdAt: documents.createdAt,
					envelopeId: envelopes.id,
					envelopeTitle: envelopes.title,
					envelopeStatus: envelopes.status,
				})
				.from(documents)
				.innerJoin(envelopes, eq(documents.envelopeId, envelopes.id))
				.where(eq(envelopes.userId, userId))
				.orderBy(desc(documents.createdAt))
				.limit(input?.limit ?? 5)

			return recentDocuments
		}),

	// Get notarization session appointments (NOTARIZATION type)
	// Shows: PENDING (waiting for ENP to accept), CONFIRMED (accepted, waiting for ENP to start),
	// and appointments with active meetings (ready to join)
	getSigningSessions: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(10).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const userRole = ctx.session.user.role
			const isENP = userRole === "ENP"
			const principalSubquery = ctx.db
				.select({ id: appointmentParticipants.appointmentId })
				.from(appointmentParticipants)
				.where(eq(appointmentParticipants.userId, userId))
			const appointmentScope = isENP
				? eq(appointments.userId, userId)
				: inArray(appointments.id, principalSubquery)

			// Get NOTARIZATION appointments that are PENDING or CONFIRMED
			const signingAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					meetingId: appointments.meetingId,
					title: appointments.title,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					location: appointments.location,
					createdAt: appointments.createdAt,
				})
				.from(appointments)
				.where(
					and(
						appointmentScope,
						eq(appointments.type, "NOTARIZATION"),
						or(
							eq(appointments.status, "PENDING"),
							eq(appointments.status, "CONFIRMED"),
							eq(appointments.status, "ONGOING")
						)
					)
				)
				// Sort by most recently created/booked first so new bookings appear immediately
				.orderBy(desc(appointments.createdAt))
				.limit(input?.limit ?? 5)

			const appointmentsWithMeetingStatus = signingAppointments.map(apt => {
				const activeMeetingId = apt.status === "ONGOING" ? apt.meetingId : null
				const linkedMeetingStatus = apt.status

				return {
					...apt,
					activeMeetingId,
					linkedMeetingStatus,
					canJoin: !!activeMeetingId,
				}
			})

			return appointmentsWithMeetingStatus
		}),

	// Get recent meetings
	getRecentMeetings: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(10).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Show meetings the user is an ACCEPTED participant of (not just meetings they created)
			const rows = await ctx.db
				.select({
					id: meetings.id,
					title: appointments.title,
					roomId: meetings.roomId,
					status: appointments.status,
					createdAt: meetings.createdAt,
					createdById: appointments.userId,
					creatorFirstName: users.firstName,
					creatorMiddleName: users.middleName,
					creatorLastName: users.lastName,
					creatorEmail: users.email,
					creatorImage: users.image,
				})
				.from(appointmentParticipants)
				.innerJoin(appointments, eq(appointmentParticipants.appointmentId, appointments.id))
				.innerJoin(meetings, eq(appointments.meetingId, meetings.id))
				.innerJoin(users, eq(appointments.userId, users.id))
				.where(
					and(
						eq(appointmentParticipants.userId, userId),
						eq(appointmentParticipants.status, "ACCEPTED"),
						isNotNull(appointments.meetingId)
					)
				)
				.orderBy(desc(appointments.createdAt))
				.limit(input?.limit ?? 5)

			return rows.map(r => ({
				id: r.id,
				title: r.title,
				roomId: r.roomId,
				status: r.status,
				createdAt: r.createdAt,
				createdById: r.createdById,
				creatorName: getFullName({
					firstName: r.creatorFirstName,
					middleName: r.creatorMiddleName,
					lastName: r.creatorLastName,
				}),
				creatorEmail: r.creatorEmail,
				creatorImage: r.creatorImage,
			}))
		}),

	// Get pending meeting invites for current user
	getMeetingInvites: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(20).default(5),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			const invites = await ctx.db.query.appointmentParticipants.findMany({
				where: and(
					eq(appointmentParticipants.userId, userId),
					eq(appointmentParticipants.status, "PENDING")
				),
				with: {
					appointment: {
						columns: {
							id: true,
							title: true,
							status: true,
							meetingId: true,
							createdAt: true,
							userId: true,
						},
						with: {
							createdBy: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
					invitedBy: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
				orderBy: (ap, { desc }) => [desc(ap.createdAt)],
				limit: input?.limit ?? 5,
			})

			return invites.map(invite => ({
				id: invite.id,
				createdAt: invite.createdAt,
				appointmentId: invite.appointmentId,
				appointmentTitle: invite.appointment?.title ?? "Appointment",
				appointmentStatus: invite.appointment?.status ?? "PENDING",
				meetingId: invite.appointment?.meetingId ?? null,
				host: invite.appointment?.createdBy
					? {
							id: invite.appointment.createdBy.id,
							name: invite.appointment.createdBy.name,
							email: invite.appointment.createdBy.email,
							image: invite.appointment.createdBy.image,
						}
					: null,
				invitedBy: invite.invitedBy
					? {
							id: invite.invitedBy.id,
							name: invite.invitedBy.name,
							email: invite.invitedBy.email,
							image: invite.invitedBy.image,
						}
					: null,
			}))
		}),

	// Get activity summary for chart
	getActivitySummary: protectedProcedure
		.input(
			z
				.object({
					days: z.number().min(7).max(90).default(30),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const userRole = ctx.session.user.role
			const isENP = userRole === "ENP"
			const principalSubquery = ctx.db
				.select({ id: appointmentParticipants.appointmentId })
				.from(appointmentParticipants)
				.where(eq(appointmentParticipants.userId, userId))
			const appointmentScope = isENP
				? eq(appointments.userId, userId)
				: inArray(appointments.id, principalSubquery)

			const days = input?.days ?? 30
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - days)

			// Get appointment activity
			const appointmentActivity = await ctx.db
				.select({
					date: sql<string>`DATE(${appointments.createdAt})`.as("date"),
					count: count(),
				})
				.from(appointments)
				.where(and(appointmentScope, gte(appointments.createdAt, startDate)))
				.groupBy(sql`DATE(${appointments.createdAt})`)
				.orderBy(sql`DATE(${appointments.createdAt})`)

			// Get document activity
			const documentActivity = await ctx.db
				.select({
					date: sql<string>`DATE(${documents.createdAt})`.as("date"),
					count: count(),
				})
				.from(documents)
				.innerJoin(envelopes, eq(documents.envelopeId, envelopes.id))
				.where(and(eq(envelopes.userId, userId), gte(documents.createdAt, startDate)))
				.groupBy(sql`DATE(${documents.createdAt})`)
				.orderBy(sql`DATE(${documents.createdAt})`)

			return {
				appointments: appointmentActivity,
				documents: documentActivity,
			}
		}),

	// Get appointment type distribution
	getAppointmentTypeDistribution: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const userRole = ctx.session.user.role
		const isENP = userRole === "ENP"
		const principalSubquery = ctx.db
			.select({ id: appointmentParticipants.appointmentId })
			.from(appointmentParticipants)
			.where(eq(appointmentParticipants.userId, userId))
		const appointmentScope = isENP
			? eq(appointments.userId, userId)
			: inArray(appointments.id, principalSubquery)

		const distribution = await ctx.db
			.select({
				type: appointments.type,
				count: count(),
			})
			.from(appointments)
			.where(appointmentScope)
			.groupBy(appointments.type)

		return distribution
	}),

	// Get appointment status distribution
	getAppointmentStatusDistribution: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const userRole = ctx.session.user.role
		const isENP = userRole === "ENP"
		const principalSubquery = ctx.db
			.select({ id: appointmentParticipants.appointmentId })
			.from(appointmentParticipants)
			.where(eq(appointmentParticipants.userId, userId))
		const appointmentScope = isENP
			? eq(appointments.userId, userId)
			: inArray(appointments.id, principalSubquery)

		const distribution = await ctx.db
			.select({
				status: appointments.status,
				count: count(),
			})
			.from(appointments)
			.where(appointmentScope)
			.groupBy(appointments.status)

		return distribution
	}),

	// Get document status distribution
	getDocumentStatusDistribution: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const distribution = await ctx.db
			.select({
				status: documents.status,
				count: count(),
			})
			.from(documents)
			.innerJoin(envelopes, eq(documents.envelopeId, envelopes.id))
			.where(eq(envelopes.userId, userId))
			.groupBy(documents.status)

		return distribution
	}),
})
