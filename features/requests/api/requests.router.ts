import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq } from "drizzle-orm"
import { z } from "zod/v4"

import { getUrl } from "@/core/lib/get-url"

import { users } from "@/services/drizzle/schema/auth"
import { enpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { sendNotarizationRequestNotification } from "@/services/react-email/lib/send.notarization-request"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

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
		// Documents are linked via envelopes or meetings, not directly to requests
		// For now, return 0 as documents are uploaded separately after request creation
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

		// Get document counts for each request
		const requestsWithCounts = incomingRequests.map(request => ({
			...request,
			documents: 0, // Documents are uploaded separately after request is created
		}))

		return requestsWithCounts
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
		let request
		try {
			const result = await ctx.db
				.insert(notarizationRequests)
				.values({
					principalId: userId,
					enpId: input.enpId,
					title: input.title,
					description: input.description ?? null,
					workflow: input.workflow,
					priority: input.priority,
					status: "PENDING",
				})
				.returning()

			request = result[0]

			if (!request) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create notarization request - no record returned",
				})
			}
		} catch (error) {
			console.error("Database error creating notarization request:", error)
			if (error instanceof Error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to create notarization request: ${error.message}`,
					cause: error,
				})
			}
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create notarization request",
				cause: error,
			})
		}

		// Fetch with relations
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
		if (requestWithRelations?.enp?.email && requestWithRelations?.principal?.name) {
			try {
				const requestUrl = `${getUrl()}/requests`
				await sendNotarizationRequestNotification({
					enpEmail: requestWithRelations.enp.email,
					enpName: requestWithRelations.enp.name ?? "ENP",
					principalName: requestWithRelations.principal.name,
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

		return {
			...requestWithRelations!,
			documents: 0,
		}
	}),

	// Update request status
	updateRequestStatus: protectedProcedure
		.input(updateRequestStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Get the request
			const request = await ctx.db.query.notarizationRequests.findFirst({
				where: eq(notarizationRequests.id, input.requestId),
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarization request not found",
				})
			}

			// Check permissions: ENP can update status, Principal can only update their own requests
			const isENP = userId === request.enpId
			const isPrincipal = userId === request.principalId

			if (!isENP && !isPrincipal) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this request",
				})
			}

			// Only ENP can change status to IN_PROGRESS, COMPLETED, or REJECTED
			if (input.status !== "PENDING" && !isENP) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the ENP can change the request status",
				})
			}

			// Update the request
			const [updatedRequest] = await ctx.db
				.update(notarizationRequests)
				.set({
					status: input.status,
					rejectReason: input.rejectReason ?? null,
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

			// Fetch with relations
			const requestWithRelations = await ctx.db.query.notarizationRequests.findFirst({
				where: eq(notarizationRequests.id, updatedRequest.id),
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

			return {
				...requestWithRelations!,
				documents: 0,
			}
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

			return {
				...request,
				documents: 0, // Documents are uploaded separately after request is created
			}
		}),

	// =================== ENP Schedule Management ===================

	// Get ENP availability including blocked slots
	getEnpSchedule: protectedProcedure
		.input(
			z.object({
				month: z.number(),
				year: z.number(),
			})
		)
		.query(async ({ ctx }) => {
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

			return {
				regular: regularAvailability,
				blocked: blockedSlots,
				recurringBlocked,
				custom: customAvailability,
			}
		}),

	// Block/unblock time slot
	blockTimeSlot: protectedProcedure
		.input(
			z.object({
				type: z.enum(["ONE_TIME", "RECURRING"]), // Block single day or recurring
				date: z.string().optional(), // YYYY-MM-DD (for ONE_TIME)
				dayOfWeek: z.number().optional(), // 0-6 (for RECURRING)
				startTime: z.string(), // HH:MM format
				endTime: z.string(), // HH:MM format
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
				// Validate date is provided
				if (!input.date) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Date is required for one-time blocks",
					})
				}

				// Create BLOCKED entry for specific date
				await ctx.db.insert(enpAvailability).values({
					enpId: ctx.session.user.id,
					type: BLOCKED,
					date: input.date,
					dayOfWeek: new Date(input.date).getDay(),
					startTime: input.startTime,
					endTime: input.endTime,
					reason: input.reason,
				})
			} else {
				// Create RECURRING_BLOCKED entries for specified days
				// If dayOfWeek is not provided, apply to all 7 days
				const days = input.dayOfWeek !== undefined ? [input.dayOfWeek] : [0, 1, 2, 3, 4, 5, 6] // All days

				// Create entries for each selected day
				const entries = days.map(day => ({
					enpId: ctx.session.user.id,
					type: RECURRING_BLOCKED,
					date: null,
					dayOfWeek: day,
					startTime: input.startTime,
					endTime: input.endTime,
					reason: input.reason ?? "Recurring blocked time",
					isAvailable: false,
					isAllDays: input.dayOfWeek === undefined,
				}))

				// Insert all entries at once
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
		.input(z.object({ availabilityId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP and slot belongs to them
			const availability = await ctx.db.query.enpAvailability.findFirst({
				where: eq(enpAvailability.id, input.availabilityId),
			})

			if (availability?.enpId !== userId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Availability slot not found or you don't have permission",
				})
			}

			// Delete blocked slot entry
			await ctx.db.delete(enpAvailability).where(eq(enpAvailability.id, input.availabilityId))

			return {
				success: true,
				message: "Time slot unblocked successfully",
			}
		}),
})
