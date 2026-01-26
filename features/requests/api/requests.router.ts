import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, gte, or } from "drizzle-orm"
import { z } from "zod/v4"

import { getUrl } from "@/core/lib/get-url"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { enpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { sendNotarizationRequestNotification } from "@/services/react-email/lib/send.notarization-request"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

// Import schedule router
import { scheduleRouter } from "@/features/schedule/api/schedule.router"

// Type-safe enum constants
const BLOCKED = "BLOCKED" as const
const RECURRING_BLOCKED = "RECURRING_BLOCKED" as const

const createRequestSchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	workflow: z.enum(["REN", "IEN"]),
	priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
})

const updateRequestStatusSchema = z.object({
	requestId: z.string().min(1, "Request ID is required"),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
	rejectReason: z.string().optional(),
})

// Shared type for incoming items (both requests and appointments)
// This ensures compatibility with both request and appointment structures
export type IncomingItem = {
	id: string
	title: string
	description: string | null
	status: "PENDING" | "CONFIRMED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "IN_PROGRESS"
	workflow: "REN" | "IEN"
	priority?: string
	createdAt: Date
	updatedAt: Date
	enpId: string
	principalId: string
	appointmentId: string | null
	rejectReason: string | null
	principal?: {
		name?: string | null
		image?: string | null
		email?: string | null
	}
	documents: number
	source: "request" | "appointment"
	requestData?: {
		id: string
		status: string
		createdAt: Date
		updatedAt: Date
		description: string | null
		title: string
		enpId: string
		workflow: string
		priority: string
		principalId: string
		appointmentId: string | null
		rejectReason: string | null
		principal?: {
			name?: string | null
			email?: string | null
			image?: string | null
		}
	}
	appointmentData?: {
		id: string
		type: "DOCUMENT_SIGNING" | "CONSULTATION"
		status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
		appointmentDate: Date
		duration: number
		notes: string | null
		location: string | null
		meetingLink: string | null
		cancelReason: string | null
		createdAt: Date
		updatedAt: Date
		clientId: string
		lawyerId: string
		client?: {
			name?: string | null
			image?: string | null
		}
	}
}

export const requestsRouter = createTRPCRouter({
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
				eq(appointments.lawyerId, userId),
				or(eq(appointments.status, "PENDING"), eq(appointments.status, "CONFIRMED")),
				gte(appointments.appointmentDate, new Date()) // Only upcoming appointments
			),
			orderBy: [asc(appointments.appointmentDate)],
			with: {
				client: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		})

		// Map appointments to same structure as requests for consistency
		// We'll use a 'source' field to distinguish between requests and appointments
		const appointmentsAsRequests = incomingAppointments.map(apt => ({
			id: apt.id,
			title: apt.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation",
			description: apt.notes,
			status: apt.status,
			workflow: apt.meetingLink ? "REN" : "IEN",
			priority: "NORMAL" as const,
			createdAt: apt.createdAt,
			updatedAt: apt.updatedAt,
			enpId: apt.lawyerId,
			principalId: apt.clientId,
			appointmentId: apt.id, // Link back to appointment
			rejectReason: apt.cancelReason,
			principal: {
				name: apt.client?.name,
				image: apt.client?.image,
			},
			documents: 0,
			source: "appointment" as const, // Mark as coming from appointment
			appointmentData: apt, // Keep full appointment data for actions
		}))

		return appointmentsAsRequests
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
				const requestUrl = `${getUrl()}/requests`
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

	// Update request status
	updateRequestStatus: protectedProcedure.input(updateRequestStatusSchema).mutation(async ({ ctx, input }) => {
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

	// =================== ENP Schedule Management ===================

	// Get ENP's schedule including their own events
	getEnpSchedule: protectedProcedure
		.input(
			z.object({
				month: z.number(),
				year: z.number(),
			})
		)
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

			// Get ENP's own events from schedule router
			const myAppointments = await scheduleRouter.createCaller(ctx).getEnpScheduleWithEvents({
				month: input.month,
				year: input.year,
			})

			return {
				regular: regularAvailability,
				blocked: blockedSlots,
				recurringBlocked,
				custom: customAvailability,
				myAppointments: myAppointments.myAppointments,
			}
		}),

	// Block/unblock time slot
	blockTimeSlot: protectedProcedure
		.input(
			z.object({
				type: z.enum(["ONE_TIME", "RECURRING"]),
				date: z.string().optional(),
				dayOfWeek: z.number().optional(),
				startTime: z.string(),
				endTime: z.string(),
				reason: z.string().optional(),
			})
		)
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
	unblockTimeSlot: protectedProcedure.input(z.object({ availabilityId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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
