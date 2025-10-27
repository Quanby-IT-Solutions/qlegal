import type { Prisma } from "@prisma/client"

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
		const whereCondition: Prisma.UserWhereInput = {}

		// Apply search filter
		if (input.search) {
			const searchTerm = input.search.toLowerCase()
			whereCondition.OR = [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ email: { contains: searchTerm, mode: "insensitive" } },
				{ organization: { contains: searchTerm, mode: "insensitive" } },
			]
		}

		// Apply role filter
		if (input.role && input.role !== "all") {
			whereCondition.role = input.role
		}

		// Apply status filter
		if (input.status && input.status !== "all") {
			switch (input.status) {
				case "active":
					whereCondition.AND = [{ emailVerified: { not: null } }, { suspendedAt: null }]
					break
				case "pending":
					whereCondition.emailVerified = null
					break
				case "suspended":
					whereCondition.suspendedAt = { not: null }
					break
			}
		}

		// Calculate pagination
		const page = input.page ?? 1
		const limit = input.limit ?? 10
		const skip = (page - 1) * limit

		// Get total count for pagination
		const totalCount = await ctx.db.user.count({
			where: whereCondition,
		})

		const users = await ctx.db.user.findMany({
			where: whereCondition,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				organization: true,
				image: true,
				emailVerified: true,
				suspendedAt: true,
			},
			orderBy: {
				id: "desc",
			},
			skip,
			take: limit,
		})

		// Transform to match the expected frontend format
		const transformedUsers = users.map(user => ({
			id: user.id,
			name: user.name ?? "Unknown User",
			email: user.email ?? "no-email@example.com",
			role: user.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: user.organization,
			status: user.suspendedAt
				? ("suspended" as const)
				: user.emailVerified
					? ("active" as const)
					: ("pending" as const),
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
		const totalUsers = await ctx.db.user.count()

		const activeUsers = await ctx.db.user.count({
			where: {
				emailVerified: { not: null },
				suspendedAt: null,
			},
		})

		const pendingUsers = await ctx.db.user.count({
			where: {
				emailVerified: null,
			},
		})

		const suspendedUsers = await ctx.db.user.count({
			where: {
				suspendedAt: { not: null },
			},
		})

		return {
			total: totalUsers,
			active: activeUsers,
			pending: pendingUsers,
			suspended: suspendedUsers,
		}
	}),

	// Get single user by ID
	getById: protectedProcedure.input(getUserByIdSchema).query(async ({ ctx, input }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: input.id },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				organization: true,
				image: true,
				emailVerified: true,
				suspendedAt: true,
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
			organization: user.organization,
			status: user.suspendedAt
				? ("suspended" as const)
				: user.emailVerified
					? ("active" as const)
					: ("pending" as const),
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
		const existingUser = await ctx.db.user.findUnique({
			where: { email: input.email },
		})

		if (existingUser) {
			throw new Error("User with this email already exists")
		}

		const newUser = await ctx.db.user.create({
			data: {
				name: input.name,
				email: input.email,
				role: input.role,
				organization: input.organization,
				password: "temporary-password", // TODO: Implement proper password generation
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				organization: true,
				image: true,
				emailVerified: true,
				suspendedAt: true,
			},
		})

		return {
			id: newUser.id,
			name: newUser.name ?? "Unknown User",
			email: newUser.email ?? "no-email@example.com",
			role: newUser.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: newUser.organization,
			status: newUser.suspendedAt
				? ("suspended" as const)
				: newUser.emailVerified
					? ("active" as const)
					: ("pending" as const),
			joinDate:
				newUser.emailVerified?.toISOString().split("T")[0] ??
				new Date().toISOString().split("T")[0],
			lastActive: newUser.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0,
			avatar: newUser.image ?? null,
		}
	}),

	// Update user
	update: protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
		const updatedUser = await ctx.db.user.update({
			where: { id: input.id },
			data: {
				name: input.name,
				email: input.email,
				role: input.role,
				organization: input.organization,
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				organization: true,
				image: true,
				emailVerified: true,
				suspendedAt: true,
			},
		})

		return {
			id: updatedUser.id,
			name: updatedUser.name ?? "Unknown User",
			email: updatedUser.email ?? "no-email@example.com",
			role: updatedUser.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: updatedUser.organization,
			status: updatedUser.suspendedAt
				? ("suspended" as const)
				: updatedUser.emailVerified
					? ("active" as const)
					: ("pending" as const),
			joinDate:
				updatedUser.emailVerified?.toISOString().split("T")[0] ??
				new Date().toISOString().split("T")[0],
			lastActive: updatedUser.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0,
			avatar: updatedUser.image ?? null,
		}
	}),

	// Delete user
	delete: protectedProcedure.input(deleteUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.user.delete({
			where: { id: input.id },
		})

		return { success: true, deletedId: input.id }
	}),

	// Approve user (verify email)
	approve: protectedProcedure.input(approveUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.user.update({
			where: { id: input.id },
			data: {
				emailVerified: new Date(),
			},
		})

		return { success: true, userId: input.id, status: "active" }
	}),

	// Suspend user (set suspendedAt)
	suspend: protectedProcedure.input(suspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.user.update({
			where: { id: input.id },
			data: {
				suspendedAt: new Date(),
			},
		})

		return { success: true, userId: input.id, status: "suspended" }
	}),

	// Unsuspend user (clear suspendedAt)
	unsuspend: protectedProcedure.input(unsuspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.user.update({
			where: { id: input.id },
			data: {
				suspendedAt: null,
			},
		})

		return { success: true, userId: input.id, status: "active" }
	}),

	// Get current user's default signature
	getDefaultSignature: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const user = await ctx.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				defaultSignature: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			defaultSignature: user.defaultSignature,
			hasDefaultSignature: !!user.defaultSignature,
		}
	}),
})
