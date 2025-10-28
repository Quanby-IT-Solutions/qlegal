import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { appointments } from "@/services/drizzle/schema/appointments"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	cancelAppointmentSchema,
	confirmAppointmentSchema,
	createAppointmentSchema,
	getAppointmentByIdSchema,
	getAppointmentsSchema,
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

			if (!lawyer || lawyer.role !== "ENP") {
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
			const whereConditions = [or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId))!]

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

			// Update appointment
			const [updated] = await ctx.db
				.update(appointments)
				.set({
					status: "CONFIRMED",
					meetingLink: input.meetingLink,
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
				or(eq(appointments.clientId, userId), eq(appointments.lawyerId, userId))!,
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
})
