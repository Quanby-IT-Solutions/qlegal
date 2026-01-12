import { and, eq, ilike, or } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/services/trpc/init"

import { getLawyerByIdSchema, searchLawyersSchema } from "./lawyers.schema"

export const lawyersRouter = createTRPCRouter({
	// Get all lawyers (ENP role users) with their profiles
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
					ilike(users.phoneNumber, searchTerm),
					ilike(enpProfiles.specialization, searchTerm)
				)!
			)
		}

		// Fetch lawyers with their profiles (left join in case profile doesn't exist)
		const lawyers = await ctx.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				phoneNumber: users.phoneNumber,
				emailVerified: users.emailVerified,
				// ENP Profile fields
				specialization: enpProfiles.specialization,
				bio: enpProfiles.bio,
				experience: enpProfiles.experience,
				languages: enpProfiles.languages,
				responseTime: enpProfiles.responseTime,
				rating: enpProfiles.rating,
				reviewCount: enpProfiles.reviewCount,
				isAvailable: enpProfiles.isAvailable,
			})
			.from(users)
			.leftJoin(enpProfiles, eq(users.id, enpProfiles.userId))
			.where(and(...whereConditions))
			.limit(limit)
			.offset(offset)
			.orderBy(users.name)

		// Transform the data to parse languages JSON and provide defaults
		return lawyers.map(lawyer => ({
			id: lawyer.id,
			name: lawyer.name,
			email: lawyer.email,
			image: lawyer.image,
			phoneNumber: lawyer.phoneNumber,
			emailVerified: lawyer.emailVerified,
			specialization: lawyer.specialization || null,
			bio: lawyer.bio || null,
			experience: lawyer.experience || null,
			languages: lawyer.languages
				? (() => {
						try {
							return JSON.parse(lawyer.languages) as string[]
						} catch {
							return []
						}
					})()
				: [],
			responseTime: lawyer.responseTime || null,
			rating: lawyer.rating ?? 0,
			reviewCount: lawyer.reviewCount ?? 0,
			isAvailable: lawyer.isAvailable ?? true,
		}))
	}),

	// Get lawyer by ID with profile
	getLawyerById: publicProcedure.input(getLawyerByIdSchema).query(async ({ ctx, input }) => {
		const { lawyerId } = input

		const result = await ctx.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				phoneNumber: users.phoneNumber,
				emailVerified: users.emailVerified,
				role: users.role,
				// ENP Profile fields
				specialization: enpProfiles.specialization,
				bio: enpProfiles.bio,
				experience: enpProfiles.experience,
				languages: enpProfiles.languages,
				responseTime: enpProfiles.responseTime,
				rating: enpProfiles.rating,
				reviewCount: enpProfiles.reviewCount,
				isAvailable: enpProfiles.isAvailable,
			})
			.from(users)
			.leftJoin(enpProfiles, eq(users.id, enpProfiles.userId))
			.where(eq(users.id, lawyerId))
			.limit(1)

		const lawyer = result[0]

		if (!lawyer || lawyer.role !== "ENP") {
			return null
		}

		// Transform the data to parse languages JSON and provide defaults
		return {
			id: lawyer.id,
			name: lawyer.name,
			email: lawyer.email,
			image: lawyer.image,
			phoneNumber: lawyer.phoneNumber,
			emailVerified: lawyer.emailVerified,
			role: lawyer.role,
			specialization: lawyer.specialization || null,
			bio: lawyer.bio || null,
			experience: lawyer.experience || null,
			languages: lawyer.languages
				? (() => {
						try {
							return JSON.parse(lawyer.languages) as string[]
						} catch {
							return []
						}
					})()
				: [],
			responseTime: lawyer.responseTime || null,
			rating: lawyer.rating ?? 0,
			reviewCount: lawyer.reviewCount ?? 0,
			isAvailable: lawyer.isAvailable ?? true,
		}
	}),

	// Get total count of lawyers
	getLawyersCount: publicProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.select().from(users).where(eq(users.role, "ENP"))

		return result.length
	}),
})
