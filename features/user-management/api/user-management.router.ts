import { TRPCError } from "@trpc/server"
import { and, count, desc, eq, ilike, or } from "drizzle-orm"
import { z } from "zod/v4"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	approveUserSchema,
	createUserSchema,
	deleteUserSchema,
	getUserByIdSchema,
	suspendUserSchema,
	unsuspendUserSchema,
	updateUserSchema,
	userListInputSchema,
} from "./user-management.schema"

export const userManagementRouter = createTRPCRouter({
	// Get all users with optional filtering
	list: protectedProcedure.input(userListInputSchema).query(async ({ ctx, input }) => {
		const conditions = []

		// Apply search filter
		if (input.search) {
			const searchTerm = `%${input.search}%`
			conditions.push(or(ilike(users.name, searchTerm), ilike(users.email, searchTerm)))
		}

		// Apply role filter
		if (input.role && input.role !== "all") {
			conditions.push(eq(users.role, input.role))
		}

		// Apply status filter
		if (input.status && input.status !== "all") {
			conditions.push(eq(users.status, input.status))
		}

		const whereCondition = conditions.length > 0 ? and(...conditions) : undefined

		// Calculate pagination
		const page = input.page ?? 1
		const limit = input.limit ?? 10
		const skip = (page - 1) * limit

		// Get total count for pagination
		const [totalCountResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(whereCondition)

		const totalCount = totalCountResult?.count ?? 0

		const userList = await ctx.db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				image: users.image,
				status: users.status,
				emailVerified: users.emailVerified,
			})
			.from(users)
			.where(whereCondition)
			.orderBy(desc(users.id))
			.limit(limit)
			.offset(skip)

		// Transform to match the expected frontend format
		const transformedUsers = userList.map(user => ({
			id: user.id,
			name: user.name ?? "Unknown User",
			email: user.email ?? "no-email@example.com",
			role: user.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: user.status.toLowerCase() as "active" | "pending" | "suspended",
			joinDate:
				user.emailVerified?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
			lastActive: user.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0, // TODO: Calculate actual document count
			avatar: user.image ?? null,
		}))

		return {
			users: transformedUsers,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages: Math.ceil(totalCount / limit),
				hasNextPage: page < Math.ceil(totalCount / limit),
				hasPreviousPage: page > 1,
			},
		}
	}),

	// Get user statistics
	stats: protectedProcedure.query(async ({ ctx }) => {
		const [totalResult] = await ctx.db.select({ count: count() }).from(users)
		const totalUsers = totalResult?.count ?? 0

		const [activeResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.status, "ACTIVE"))
		const activeUsers = activeResult?.count ?? 0

		const [pendingResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.status, "PENDING"))
		const pendingUsers = pendingResult?.count ?? 0

		const [suspendedResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.status, "SUSPENDED"))
		const suspendedUsers = suspendedResult?.count ?? 0

		return {
			total: totalUsers,
			active: activeUsers,
			pending: pendingUsers,
			suspended: suspendedUsers,
		}
	}),

	// Get single user by ID
	getById: protectedProcedure.input(getUserByIdSchema).query(async ({ ctx, input }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, input.id),
			columns: {
				id: true,
				name: true,
				email: true,
				role: true,
				image: true,
				status: true,
				emailVerified: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		return {
			id: user.id,
			name: user.name ?? "Unknown User",
			email: user.email ?? "no-email@example.com",
			role: user.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: user.status.toLowerCase() as "active" | "pending" | "suspended",
			joinDate:
				user.emailVerified?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
			lastActive: user.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0, // TODO: Calculate actual document count
			avatar: user.image ?? null,
		}
	}),

	// Create new user
	create: protectedProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
		// Check if user already exists
		const existingUser = await ctx.db.query.users.findFirst({
			where: eq(users.email, input.email),
		})

		if (existingUser) {
			throw new Error("User with this email already exists")
		}

		const [newUser] = await ctx.db
			.insert(users)
			.values({
				name: input.name,
				email: input.email,
				role: input.role,
				password: "temporary-password", // TODO: Implement proper password generation
			})
			.returning()

		return {
			id: newUser!.id,
			name: newUser!.name ?? "Unknown User",
			email: newUser!.email ?? "no-email@example.com",
			role: newUser!.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: newUser!.status.toLowerCase() as "active" | "pending" | "suspended",
			joinDate:
				newUser!.emailVerified?.toISOString().split("T")[0] ??
				new Date().toISOString().split("T")[0],
			lastActive: newUser!.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0,
			avatar: newUser!.image ?? null,
		}
	}),

	// Update user
	update: protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
		const updateData: Partial<typeof users.$inferInsert> = {}
		if (input.name !== undefined) updateData.name = input.name
		if (input.email !== undefined) updateData.email = input.email
		if (input.role !== undefined) updateData.role = input.role

		const [updatedUser] = await ctx.db
			.update(users)
			.set(updateData)
			.where(eq(users.id, input.id))
			.returning()

		return {
			id: updatedUser!.id,
			name: updatedUser!.name ?? "Unknown User",
			email: updatedUser!.email ?? "no-email@example.com",
			role: updatedUser!.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: updatedUser!.status.toLowerCase() as "active" | "pending" | "suspended",
			joinDate:
				updatedUser!.emailVerified?.toISOString().split("T")[0] ??
				new Date().toISOString().split("T")[0],
			lastActive: updatedUser!.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0,
			avatar: updatedUser!.image ?? null,
		}
	}),

	// Delete user
	delete: protectedProcedure.input(deleteUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.delete(users).where(eq(users.id, input.id))

		return { success: true, deletedId: input.id }
	}),

	// Approve user (verify email and set status to ACTIVE)
	approve: protectedProcedure.input(approveUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db
			.update(users)
			.set({ emailVerified: new Date(), status: "ACTIVE" })
			.where(eq(users.id, input.id))

		return { success: true, userId: input.id, status: "active" }
	}),

	// Suspend user
	suspend: protectedProcedure.input(suspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.update(users).set({ status: "SUSPENDED" }).where(eq(users.id, input.id))

		return { success: true, userId: input.id, status: "suspended" }
	}),

	// Unsuspend user
	unsuspend: protectedProcedure.input(unsuspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.update(users).set({ status: "ACTIVE" }).where(eq(users.id, input.id))

		return { success: true, userId: input.id, status: "active" }
	}),

	// Admin: Set ENP availability (for approval workflow or suspension)
	adminSetENPAvailability: protectedProcedure
		.input(
			z.object({
				enpId: z.string(),
				available: z.boolean(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Only admins can control other ENPs' availability
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can manage ENP availability",
				})
			}

			// Verify the target user is an ENP
			const targetUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
			})

			if (!targetUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				})
			}

			if (targetUser.role !== "ENP") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Target user is not an ENP",
				})
			}

			// Check if ENP profile exists
			const profile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, input.enpId),
			})

			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "ENP profile not found",
				})
			}

			// Update availability
			await ctx.db
				.update(enpProfiles)
				.set({ isAvailable: input.available, updatedAt: new Date() })
				.where(eq(enpProfiles.userId, input.enpId))

			console.log(
				`[Admin] ${ctx.session.user.name} set ENP ${targetUser.name} availability to: ${input.available}`
			)

			return { success: true, enpId: input.enpId, isAvailable: input.available }
		}),

	// Get current user's default signature
	getDefaultSignature: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				id: true,
				email: true,
				name: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		// Note: defaultSignature field doesn't exist in schema
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			defaultSignature: null,
			hasDefaultSignature: false,
		}
	}),
})
