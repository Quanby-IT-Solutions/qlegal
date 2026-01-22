import { and, count, desc, eq, gte, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
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
		// const isPrincipal = userRole === "PRINCIPAL"

		// Total appointments
		const [appointmentsResult] = await ctx.db
			.select({ count: count() })
			.from(appointments)
			.where(isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId))

		// Pending appointments
		const [pendingAppointmentsResult] = await ctx.db
			.select({ count: count() })
			.from(appointments)
			.where(
				and(
					isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId),
					eq(appointments.status, "PENDING")
				)
			)

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
			.where(
				and(
					isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId),
					eq(appointments.status, "COMPLETED")
				)
			)

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

			const recentAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					notes: appointments.notes,
					location: appointments.location,
					createdAt: appointments.createdAt,
					// Client info
					clientId: appointments.clientId,
					clientName: sql<string>`client.name`,
					clientEmail: sql<string>`client.email`,
					clientImage: sql<string>`client.image`,
					// Lawyer info
					lawyerId: appointments.lawyerId,
					lawyerName: sql<string>`lawyer.name`,
					lawyerEmail: sql<string>`lawyer.email`,
					lawyerImage: sql<string>`lawyer.image`,
				})
				.from(appointments)
				.innerJoin(sql`${users} as client`, eq(appointments.clientId, sql`client.id`))
				.innerJoin(sql`${users} as lawyer`, eq(appointments.lawyerId, sql`lawyer.id`))
				.where(isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId))
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

			const now = new Date()

			const upcomingAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					notes: appointments.notes,
					location: appointments.location,
					createdAt: appointments.createdAt,
					// Client info
					clientId: appointments.clientId,
					clientName: sql<string>`client.name`,
					clientEmail: sql<string>`client.email`,
					clientImage: sql<string>`client.image`,
					// Lawyer info
					lawyerId: appointments.lawyerId,
					lawyerName: sql<string>`lawyer.name`,
					lawyerEmail: sql<string>`lawyer.email`,
					lawyerImage: sql<string>`lawyer.image`,
				})
				.from(appointments)
				.innerJoin(sql`${users} as client`, eq(appointments.clientId, sql`client.id`))
				.innerJoin(sql`${users} as lawyer`, eq(appointments.lawyerId, sql`lawyer.id`))
				.where(
					and(
						isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId),
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

	// Get signing session appointments (DOCUMENT_SIGNING type)
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

			// Get DOCUMENT_SIGNING appointments that are PENDING or CONFIRMED
			const signingAppointments = await ctx.db
				.select({
					id: appointments.id,
					type: appointments.type,
					status: appointments.status,
					appointmentDate: appointments.appointmentDate,
					duration: appointments.duration,
					notes: appointments.notes,
					location: appointments.location,
					meetingLink: appointments.meetingLink,
					createdAt: appointments.createdAt,
					// Client info
					clientId: appointments.clientId,
					clientName: sql<string>`client.name`,
					clientEmail: sql<string>`client.email`,
					clientImage: sql<string>`client.image`,
					// Lawyer/ENP info
					lawyerId: appointments.lawyerId,
					lawyerName: sql<string>`lawyer.name`,
					lawyerEmail: sql<string>`lawyer.email`,
					lawyerImage: sql<string>`lawyer.image`,
				})
				.from(appointments)
				.innerJoin(sql`${users} as client`, eq(appointments.clientId, sql`client.id`))
				.innerJoin(sql`${users} as lawyer`, eq(appointments.lawyerId, sql`lawyer.id`))
				.where(
					and(
						isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId),
						eq(appointments.type, "DOCUMENT_SIGNING"),
						or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED"))
					)
				)
				// Sort by most recently created/booked first so new bookings appear immediately
				.orderBy(desc(appointments.createdAt))
				.limit(input?.limit ?? 5)

			// For each appointment, check if there's an active meeting the user can join
			const appointmentsWithMeetingStatus = await Promise.all(
				signingAppointments.map(async (apt) => {
					// Check if there's an ONGOING meeting linked to this appointment (via meetingLink)
					// The meetingLink contains the meeting ID when a meeting is created
					let activeMeetingId: string | null = null
					let linkedMeetingStatus: string | null = null
					
					if (apt.meetingLink && apt.meetingLink.trim().length > 0) {
						// Extract meeting ID from the link
						// Formats: /meetings/{id}/lobby, /meetings/{id}, http://host/meetings/{id}, http://host/meetings/{id}/lobby
						const meetingIdRegex = /\/meetings\/([a-zA-Z0-9_-]+)/
						const meetingIdMatch = meetingIdRegex.exec(apt.meetingLink)
						const potentialMeetingId = meetingIdMatch?.[1]
						
						if (potentialMeetingId) {
							// Check if this meeting exists and get its status
							const [linkedMeeting] = await ctx.db
								.select({ id: meetings.id, status: meetings.status })
								.from(meetings)
								.where(eq(meetings.id, potentialMeetingId))
								.limit(1)
							
							if (linkedMeeting) {
								linkedMeetingStatus = linkedMeeting.status
								if (linkedMeeting.status === "ONGOING") {
									activeMeetingId = linkedMeeting.id
								}
							}
						}
					}
					
					return {
						...apt,
						activeMeetingId,
						linkedMeetingStatus,
						canJoin: !!activeMeetingId,
					}
				})
			)

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
			const recentMeetings = await ctx.db
				.select({
					id: meetings.id,
					title: meetings.title,
					roomId: meetings.roomId,
					status: meetings.status,
					createdAt: meetings.createdAt,
					createdById: meetings.createdById,
					creatorName: users.name,
					creatorEmail: users.email,
					creatorImage: users.image,
				})
				.from(meetingParticipants)
				.innerJoin(meetings, eq(meetingParticipants.meetingId, meetings.id))
				.innerJoin(users, eq(meetings.createdById, users.id))
				.where(
					and(eq(meetingParticipants.userId, userId), eq(meetingParticipants.status, "ACCEPTED"))
				)
				.orderBy(desc(meetings.createdAt))
				.limit(input?.limit ?? 5)

			return recentMeetings
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

			const invites = await ctx.db.query.meetingParticipants.findMany({
				where: and(eq(meetingParticipants.userId, userId), eq(meetingParticipants.status, "PENDING")),
				with: {
					meeting: {
						columns: {
							id: true,
							title: true,
							status: true,
							createdAt: true,
							createdById: true,
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
				orderBy: (mp, { desc }) => [desc(mp.createdAt)],
				limit: input?.limit ?? 5,
			})

			return invites.map(invite => ({
				id: invite.id,
				createdAt: invite.createdAt,
				meetingId: invite.meetingId,
				meetingTitle: invite.meeting?.title ?? "Meeting",
				meetingStatus: invite.meeting?.status ?? "SCHEDULED",
				host: invite.meeting?.createdBy
					? {
							id: invite.meeting.createdBy.id,
							name: invite.meeting.createdBy.name,
							email: invite.meeting.createdBy.email,
							image: invite.meeting.createdBy.image,
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
				.where(
					and(
						isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId),
						gte(appointments.createdAt, startDate)
					)
				)
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

		const distribution = await ctx.db
			.select({
				type: appointments.type,
				count: count(),
			})
			.from(appointments)
			.where(isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId))
			.groupBy(appointments.type)

		return distribution
	}),

	// Get appointment status distribution
	getAppointmentStatusDistribution: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const userRole = ctx.session.user.role
		const isENP = userRole === "ENP"

		const distribution = await ctx.db
			.select({
				status: appointments.status,
				count: count(),
			})
			.from(appointments)
			.where(isENP ? eq(appointments.lawyerId, userId) : eq(appointments.clientId, userId))
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
