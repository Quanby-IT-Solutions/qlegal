import { TRPCError } from "@trpc/server"
import { and, desc, eq, or } from "drizzle-orm"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { witnesses } from "@/services/drizzle/schema/witnesses"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	createWitnessSchema,
	deleteWitnessSchema,
	getWitnessByIdSchema,
	getWitnessesSchema,
	updateWitnessSchema,
	verifyWitnessSchema,
} from "./witnesses.schema"

export const witnessesRouter = createTRPCRouter({
	// Create new witness
	createWitness: protectedProcedure.input(createWitnessSchema).mutation(async ({ ctx, input }) => {
		const enpId = ctx.session.user.id

		// Verify user is ENP
		const [user] = await ctx.db.select().from(users).where(eq(users.id, enpId)).limit(1)

		if (!user || user.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can create witnesses",
			})
		}

		// Create witness
		const [witness] = await ctx.db
			.insert(witnesses)
			.values({
				enpId,
				name: input.name,
				email: input.email || null,
				phoneNumber: input.phoneNumber || null,
				address: input.address || null,
				idType: input.idType || null,
				idNumber: input.idNumber || null,
				appointmentId: input.appointmentId || null,
				notes: input.notes || null,
				status: "PENDING",
			})
			.returning()

		return witness
	}),

	// Get witnesses for the current ENP
	getMyWitnesses: protectedProcedure.input(getWitnessesSchema).query(async ({ ctx, input }) => {
		const enpId = ctx.session.user.id
		const { status, appointmentId, limit, offset } = input

		try {
			// Build where conditions
			const whereConditions = [eq(witnesses.enpId, enpId)]

			if (status && status !== "ALL") {
				whereConditions.push(eq(witnesses.status, status))
			}

			if (appointmentId) {
				whereConditions.push(eq(witnesses.appointmentId, appointmentId))
			}

			// Fetch witnesses using standard Drizzle query API
			const results = await ctx.db
				.select({
					id: witnesses.id,
					enpId: witnesses.enpId,
					appointmentId: witnesses.appointmentId,
					name: witnesses.name,
					email: witnesses.email,
					phoneNumber: witnesses.phoneNumber,
					address: witnesses.address,
					idType: witnesses.idType,
					idNumber: witnesses.idNumber,
					idVerified: witnesses.idVerified,
					idVerifiedAt: witnesses.idVerifiedAt,
					signaturePath: witnesses.signaturePath,
					signatureCaptured: witnesses.signatureCaptured,
					signatureCapturedAt: witnesses.signatureCapturedAt,
					status: witnesses.status,
					notes: witnesses.notes,
					createdAt: witnesses.createdAt,
					updatedAt: witnesses.updatedAt,
					appointment: {
						id: appointments.id,
						appointmentDate: appointments.appointmentDate,
						type: appointments.type,
						status: appointments.status,
					},
				})
				.from(witnesses)
				.leftJoin(appointments, eq(witnesses.appointmentId, appointments.id))
				.where(and(...whereConditions))
				.orderBy(desc(witnesses.createdAt))
				.limit(limit)
				.offset(offset)

			return results.map(witness => {
				const appointment = witness.appointment
				const { appointment: _, ...rest } = witness
				return {
					...rest,
					appointment: appointment && appointment.id ? appointment : null,
				}
			})
		} catch (error) {
			// Check if the error is about missing table
			if (error instanceof Error && error.message.includes("does not exist")) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"Witness table does not exist. Please run database migrations: npm run db:generate && npm run db:push",
				})
			}
			throw error
		}
	}),

	// Get witness by ID
	getWitnessById: protectedProcedure.input(getWitnessByIdSchema).query(async ({ ctx, input }) => {
		const userId = ctx.session.user.id

		const [witness] = await ctx.db
			.select({
				id: witnesses.id,
				enpId: witnesses.enpId,
				appointmentId: witnesses.appointmentId,
				name: witnesses.name,
				email: witnesses.email,
				phoneNumber: witnesses.phoneNumber,
				address: witnesses.address,
				idType: witnesses.idType,
				idNumber: witnesses.idNumber,
				idVerified: witnesses.idVerified,
				idVerifiedAt: witnesses.idVerifiedAt,
				signaturePath: witnesses.signaturePath,
				signatureCaptured: witnesses.signatureCaptured,
				signatureCapturedAt: witnesses.signatureCapturedAt,
				status: witnesses.status,
				notes: witnesses.notes,
				createdAt: witnesses.createdAt,
				updatedAt: witnesses.updatedAt,
				enp: {
					id: users.id,
					name: users.name,
					email: users.email,
				},
				appointment: {
					id: appointments.id,
					appointmentDate: appointments.appointmentDate,
					type: appointments.type,
					status: appointments.status,
				},
			})
			.from(witnesses)
			.leftJoin(users, eq(witnesses.enpId, users.id))
			.leftJoin(appointments, eq(witnesses.appointmentId, appointments.id))
			.where(eq(witnesses.id, input.witnessId))
			.limit(1)

		if (!witness) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Witness not found",
			})
		}

		// Check if user is the ENP who created this witness
		if (witness.enpId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this witness",
			})
		}

		const enp = witness.enp
		const appointment = witness.appointment
		const { enp: _, appointment: __, ...rest } = witness
		return {
			...rest,
			enp: enp && enp.id ? enp : null,
			appointment: appointment && appointment.id ? appointment : null,
		}
	}),

	// Update witness
	updateWitness: protectedProcedure.input(updateWitnessSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id
		const { witnessId, ...updates } = input

		// Get existing witness
		const [existing] = await ctx.db
			.select()
			.from(witnesses)
			.where(eq(witnesses.id, witnessId))
			.limit(1)

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Witness not found",
			})
		}

		// Check if user is the ENP who created this witness
		if (existing.enpId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to update this witness",
			})
		}

		// Update witness
		const [updated] = await ctx.db
			.update(witnesses)
			.set({
				...updates,
				// If ID is being verified, set the verified timestamp
				...(updates.idVerified === true && !existing.idVerified
					? { idVerifiedAt: new Date() }
					: {}),
				updatedAt: new Date(),
			})
			.where(eq(witnesses.id, witnessId))
			.returning()

		return updated
	}),

	// Verify witness ID
	verifyWitness: protectedProcedure.input(verifyWitnessSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id
		const { witnessId, idVerified } = input

		// Get existing witness
		const [existing] = await ctx.db
			.select()
			.from(witnesses)
			.where(eq(witnesses.id, witnessId))
			.limit(1)

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Witness not found",
			})
		}

		// Check if user is the ENP who created this witness
		if (existing.enpId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to verify this witness",
			})
		}

		// Update witness verification status
		const [updated] = await ctx.db
			.update(witnesses)
			.set({
				idVerified,
				idVerifiedAt: idVerified ? new Date() : null,
				status: idVerified ? "VERIFIED" : "PENDING",
				updatedAt: new Date(),
			})
			.where(eq(witnesses.id, witnessId))
			.returning()

		return updated
	}),

	// Delete witness
	deleteWitness: protectedProcedure.input(deleteWitnessSchema).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id

		// Get existing witness
		const existing = await ctx.db.query.witnesses.findFirst({
			where: eq(witnesses.id, input.witnessId),
		})

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Witness not found",
			})
		}

		// Check if user is the ENP who created this witness
		if (existing.enpId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to delete this witness",
			})
		}

		// Delete witness
		await ctx.db.delete(witnesses).where(eq(witnesses.id, input.witnessId))

		return { success: true }
	}),
})
