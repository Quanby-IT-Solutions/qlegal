import { eq, ilike, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/services/trpc/init"

import { getLawyerByIdSchema, searchLawyersSchema } from "./lawyers.schema"

export const lawyersRouter = createTRPCRouter({
	// Get all lawyers (ENP role users)
	getLawyers: publicProcedure.input(searchLawyersSchema).query(async ({ ctx, input }) => {
		const { query, limit = 50, offset = 0 } = input

		// Build where condition
		const whereConditions = [eq(users.role, "ENP")]

		// Add search filter if query provided
		if (query && query.trim()) {
			const searchTerm = `%${query.toLowerCase()}%`
			whereConditions.push(
				or(
					ilike(users.name, searchTerm),
					ilike(users.email, searchTerm),
					ilike(users.phoneNumber, searchTerm)
				)!
			)
		}

		// Fetch lawyers
		const lawyers = await ctx.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				phoneNumber: users.phoneNumber,
				emailVerified: users.emailVerified,
			})
			.from(users)
			.where(eq(users.role, "ENP"))
			.limit(limit)
			.offset(offset)
			.orderBy(users.name)

		return lawyers
	}),

	// Get lawyer by ID
	getLawyerById: publicProcedure
		.input(getLawyerByIdSchema)
		.query(async ({ ctx, input }) => {
			const { lawyerId } = input

			const lawyer = await ctx.db.query.users.findFirst({
				where: eq(users.id, lawyerId),
				columns: {
					id: true,
					name: true,
					email: true,
					image: true,
					phoneNumber: true,
					emailVerified: true,
					role: true,
				},
			})

			if (!lawyer || lawyer.role !== "ENP") {
				return null
			}

			return lawyer
		}),

	// Get total count of lawyers
	getLawyersCount: publicProcedure.query(async ({ ctx }) => {
		const result = await ctx.db
			.select()
			.from(users)
			.where(eq(users.role, "ENP"))

		return result.length
	}),
})
