import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { enpAvailability, enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

export const enpProfileRouter = createTRPCRouter({
	// Get ENP's own profile
	getMyProfile: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is ENP
		if (ctx.session.user.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can access this endpoint",
			})
		}

		const profile = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, userId),
		})

		return profile
	}),

	// Create or update ENP profile
	upsertProfile: protectedProcedure
		.input(
			z.object({
				specialization: z.string().optional(),
				bio: z.string().optional(),
				experience: z.string().optional(),
				languages: z.array(z.string()).optional(),
				responseTime: z.string().optional(),
				isAvailable: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			if (ctx.session.user.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can update their profile",
				})
			}

			// Check if profile exists
			const existing = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, userId),
			})

			const languagesJson = input.languages ? JSON.stringify(input.languages) : undefined

			if (existing) {
				// Update existing profile
				const [updated] = await ctx.db
					.update(enpProfiles)
					.set({
						...input,
						languages: languagesJson || existing.languages,
						updatedAt: new Date(),
					})
					.where(eq(enpProfiles.userId, userId))
					.returning()

				return updated
			} else {
				// Create new profile
				const [created] = await ctx.db
					.insert(enpProfiles)
					.values({
						userId,
						...input,
						languages: languagesJson || '["English"]',
					})
					.returning()

				return created
			}
		}),

	// Get ENP availability schedule
	getMyAvailability: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is ENP
		if (ctx.session.user.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can access this endpoint",
			})
		}

		const availability = await ctx.db.query.enpAvailability.findMany({
			where: eq(enpAvailability.enpId, userId),
		})

		return availability
	}),

	// Set availability for a specific day
	setAvailability: protectedProcedure
		.input(
			z.object({
				dayOfWeek: z.number().min(0).max(6),
				startTime: z.string().regex(/^\d{2}:\d{2}$/),
				endTime: z.string().regex(/^\d{2}:\d{2}$/),
				isAvailable: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			if (ctx.session.user.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can set their availability",
				})
			}

			// Check if availability already exists for this day
			const existing = await ctx.db.query.enpAvailability.findFirst({
				where: eq(enpAvailability.enpId, userId),
			})

			if (existing) {
				// Update existing
				const [updated] = await ctx.db
					.update(enpAvailability)
					.set({
						startTime: input.startTime,
						endTime: input.endTime,
						isAvailable: input.isAvailable ?? true,
						updatedAt: new Date(),
					})
					.where(eq(enpAvailability.enpId, userId))
					.returning()

				return updated
			} else {
				// Create new
				const [created] = await ctx.db
					.insert(enpAvailability)
					.values({
						enpId: userId,
						dayOfWeek: input.dayOfWeek,
						startTime: input.startTime,
						endTime: input.endTime,
						isAvailable: input.isAvailable ?? true,
					})
					.returning()

				return created
			}
		}),

	// Delete availability slot
	deleteAvailability: protectedProcedure
		.input(z.object({ availabilityId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is ENP
			if (ctx.session.user.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can manage their availability",
				})
			}

			await ctx.db.delete(enpAvailability).where(eq(enpAvailability.id, input.availabilityId))

			return { success: true }
		}),
})
