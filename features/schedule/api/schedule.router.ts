import { TRPCError } from "@trpc/server"
import { and, asc, eq, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { createEnpEventSchema, deleteEnpEventSchema, updateEnpEventSchema } from "./schedule.schema"

export const scheduleRouter = createTRPCRouter({
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

			// Build notes from all available metadata
			const notes = [
				input.description,
				input.workflow === "REN" || (input.type === "CONSULTATION" && !input.location)
					? "Workflow: Remote Electronic Notarization (REN)"
					: input.workflow === "IEN" && input.location
						? "Workflow: In-Person Electronic Notarization (IEN)"
						: "",
			]
				.filter(Boolean)
				.join("\n")

			// Create self-appointment (client = lawyer = ENP)
			const [appointment] = await ctx.db
				.insert(appointments)
				.values({
					clientId: userId,
					lawyerId: userId,
					type: input.type,
					appointmentDate: appointmentDateTime,
					duration: duration ?? 60,
					notes: notes || null,
					location:
						input.type === "DOCUMENT_SIGNING" && input.workflow === "IEN"
							? (input.location ?? undefined)
							: null,
					meetingLink: null, // Set when confirmed
					status: "CONFIRMED", // ENP-created events are auto-confirmed
				})
				.returning()

			if (!appointment) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create appointment",
				})
			}

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
			if (existing.lawyerId !== userId || existing.clientId !== userId) {
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

			// Build notes
			const notes = [
				input.description ?? existing.notes,
				input.workflow === "REN" || (input.type === "CONSULTATION" && !input.location)
					? "Workflow: Remote Electronic Notarization (REN)"
					: input.workflow === "IEN" && input.location
						? "Workflow: In-Person Electronic Notarization (IEN)"
						: "",
			]
				.filter(Boolean)
				.join("\n")

			const [updated] = await ctx.db
				.update(appointments)
				.set({
					appointmentDate: appointmentDateTime,
					duration,
					notes,
					location:
						input.type === "DOCUMENT_SIGNING" && input.workflow === "IEN"
							? (input.location ?? existing.location)
							: null,
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
			if (existing.lawyerId !== userId || existing.clientId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete your own events",
				})
			}

			await ctx.db.delete(appointments).where(eq(appointments.id, input.appointmentId))

			return { success: true }
		}),

	// Get ENP's schedule with their events
	getEnpScheduleWithEvents: protectedProcedure
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

			// Get ENP's own appointments (self-created)
			const myAppointments = await ctx.db.query.appointments.findMany({
				where: and(
					eq(appointments.lawyerId, userId),
					eq(appointments.clientId, userId), // Self-appointment
					or(eq(appointments.status, "CONFIRMED"), eq(appointments.status, "PENDING")),
					sql`EXTRACT(MONTH FROM ${appointments.appointmentDate}) = ${input.month}`,
					sql`EXTRACT(YEAR FROM ${appointments.appointmentDate}) = ${input.year}`
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

			return {
				myAppointments,
			}
		}),
})
