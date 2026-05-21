import { TRPCError } from "@trpc/server"
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { getFullName } from "@/core/lib/utils"

import { autoJoinMemberInDoconchainOrganization } from "@/services/doconchain/organization/auto-join-member"
import { createDoconchainSubOrganization } from "@/services/doconchain/organization/create-sub-organization"
import {
	findParentOrgMemberIdByEmail,
	getParentOrgMembers,
} from "@/services/doconchain/organization/get-parent-org-members"
import { moveDoconchainMemberToSubOrg } from "@/services/doconchain/organization/move-member-to-sub-org"
import { transferDoconchainCreditsToSubOrg } from "@/services/doconchain/organization/transfer-credits"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	approveUserSchema,
	clearEnpDoconchainSubOrgSchema,
	createUserSchema,
	deleteUserSchema,
	getUserByIdSchema,
	provisionEnpDoconchainSubOrgSchema,
	suspendUserSchema,
	transferEnpDoconchainCreditsSchema,
	unsuspendUserSchema,
	updateUserSchema,
	userListInputSchema,
} from "./user-management.schema"

export const userManagementRouter = createTRPCRouter({
	// Get all users with optional filtering
	list: protectedProcedure.input(userListInputSchema).query(async ({ ctx, input }) => {
		const conditions = []

		// Apply search filter (full name = first + middle + last)
		if (input.search) {
			const searchTerm = `%${input.search}%`
			conditions.push(
				or(
					ilike(
						sql`concat_ws(' ', coalesce(${users.firstName},''), coalesce(${users.middleName},''), coalesce(${users.lastName},''))`,
						searchTerm
					),
					ilike(users.email, searchTerm)
				)
			)
		}

		// Apply role filter
		if (input.role && input.role !== "all") {
			conditions.push(eq(users.role, input.role))
		}

		// Apply status filter
		if (input.status && input.status !== "all") {
			conditions.push(eq(users.commissionStatus, input.status))
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
				firstName: users.firstName,
				middleName: users.middleName,
				lastName: users.lastName,
				email: users.email,
				role: users.role,
				image: users.image,
				status: users.commissionStatus,
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
			name: getFullName(user) || "Unknown User",
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
			.where(eq(users.commissionStatus, "ACTIVE"))
		const activeUsers = activeResult?.count ?? 0

		const [pendingResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.commissionStatus, "PENDING"))
		const pendingUsers = pendingResult?.count ?? 0

		const [suspendedResult] = await ctx.db
			.select({ count: count() })
			.from(users)
			.where(eq(users.commissionStatus, "SUSPENDED"))
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
				firstName: true,
				middleName: true,
				lastName: true,
				email: true,
				role: true,
				image: true,
				commissionStatus: true,
				emailVerified: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		const enpProfile =
			user.role === "ENP"
				? await ctx.db.query.enpProfiles.findFirst({
						where: eq(enpProfiles.userId, user.id),
						columns: {
							notaryAddress: true,
							doconchainSubOrgId: true,
							doconchainSubOrgName: true,
							doconchainSubOrgAddress: true,
							doconchainSubOrgCreatedAt: true,
							isAvailable: true,
						},
					})
				: null

		return {
			id: user.id,
			name: getFullName(user) || "Unknown User",
			email: user.email ?? "no-email@example.com",
			role: user.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: user.commissionStatus.toLowerCase() as "active" | "pending" | "suspended",
			joinDate:
				user.emailVerified?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
			lastActive: user.emailVerified?.toISOString() ?? new Date().toISOString(),
			documentsCount: 0, // TODO: Calculate actual document count
			avatar: user.image ?? null,
			firstName: user.firstName,
			middleName: user.middleName,
			lastName: user.lastName,
			enpProfile:
				user.role === "ENP" && enpProfile
					? {
							notaryAddress: enpProfile.notaryAddress,
							isAvailable: enpProfile.isAvailable,
							doconchainSubOrgId: enpProfile.doconchainSubOrgId,
							doconchainSubOrgName: enpProfile.doconchainSubOrgName,
							doconchainSubOrgAddress: enpProfile.doconchainSubOrgAddress,
							doconchainSubOrgCreatedAt:
								enpProfile.doconchainSubOrgCreatedAt?.toISOString() ?? null,
						}
					: null,
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
				firstName: input.firstName,
				middleName: input.middleName ?? null,
				lastName: input.lastName,
				email: input.email,
				role: input.role,
				password: "temporary-password", // TODO: Implement proper password generation
			})
			.returning()

		return {
			id: newUser!.id,
			name: getFullName(newUser!) || "Unknown User",
			email: newUser!.email ?? "no-email@example.com",
			role: newUser!.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: newUser!.commissionStatus.toLowerCase() as "active" | "pending" | "suspended",
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
		if (input.firstName !== undefined) updateData.firstName = input.firstName
		if (input.middleName !== undefined) updateData.middleName = input.middleName ?? null
		if (input.lastName !== undefined) updateData.lastName = input.lastName
		if (input.email !== undefined) updateData.email = input.email
		if (input.role !== undefined) updateData.role = input.role

		// If any name part is being updated, recompute full name (fetch current if only some parts sent)
		const namePartsUpdated =
			input.firstName !== undefined ||
			input.middleName !== undefined ||
			input.lastName !== undefined
		if (namePartsUpdated) {
			const current = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.id),
				columns: { firstName: true, middleName: true, lastName: true },
			})
			const firstName = input.firstName ?? current?.firstName ?? ""
			const middleName = input.middleName ?? current?.middleName ?? ""
			const lastName = input.lastName ?? current?.lastName ?? ""
			updateData.name = [firstName, middleName, lastName].filter(Boolean).join(" ").trim()
		}

		const [updatedUser] = await ctx.db
			.update(users)
			.set(updateData)
			.where(eq(users.id, input.id))
			.returning()

		return {
			id: updatedUser!.id,
			name: getFullName(updatedUser!) || "Unknown User",
			email: updatedUser!.email ?? "no-email@example.com",
			role: updatedUser!.role.toLowerCase().replace("_", "-") as "client" | "admin" | "super-admin",
			organization: null,
			status: updatedUser!.commissionStatus.toLowerCase() as "active" | "pending" | "suspended",
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
			.set({ emailVerified: new Date(), commissionStatus: "ACTIVE" })
			.where(eq(users.id, input.id))

		return { success: true, userId: input.id, status: "active" }
	}),

	// Suspend user
	suspend: protectedProcedure.input(suspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.update(users).set({ commissionStatus: "SUSPENDED" }).where(eq(users.id, input.id))

		return { success: true, userId: input.id, status: "suspended" }
	}),

	// Unsuspend user
	unsuspend: protectedProcedure.input(unsuspendUserSchema).mutation(async ({ ctx, input }) => {
		await ctx.db.update(users).set({ commissionStatus: "ACTIVE" }).where(eq(users.id, input.id))

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
				`[Admin] ${ctx.session.user.name} set ENP ${getFullName(targetUser)} availability to: ${input.available}`
			)

			return { success: true, enpId: input.enpId, isAvailable: input.available }
		}),

	// Admin: Create (and optionally fund) a DocOnChain sub-organization for an ENP.
	provisionEnpDoconchainSubOrganization: protectedProcedure
		.input(provisionEnpDoconchainSubOrgSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can create ENP sub-organizations.",
				})
			}

			const targetUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
				columns: {
					id: true,
					firstName: true,
					middleName: true,
					lastName: true,
					email: true,
					role: true,
				},
			})
			if (!targetUser) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
			}
			if (targetUser.role !== "ENP") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Target user is not an ENP" })
			}
			if (!targetUser.email) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "ENP is missing an email address." })
			}

			const enpProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, targetUser.id),
			})
			if (!enpProfile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "ENP profile not found" })
			}

			if (enpProfile.doconchainSubOrgId) {
				return {
					created: false,
					subOrgId: enpProfile.doconchainSubOrgId,
					subOrgName: enpProfile.doconchainSubOrgName ?? null,
				}
			}

			const subOrgName =
				(input.name ?? getFullName(targetUser) ?? "").trim() || `ENP ${targetUser.id}`
			const subOrgAddress =
				(input.address ?? enpProfile.notaryAddress ?? "").trim() || "Not provided"

			let createdAtIso: string | null = null
			const created = await createDoconchainSubOrganization({
				name: subOrgName,
				address: subOrgAddress,
				subOrganizationTypeName: input.subOrganizationTypeName ?? "Department",
			})
			createdAtIso = created.raw.data?.sub_org_data?.created_at ?? created.raw.created_at ?? null

			// Ensure the ENP is a member of their sub-org. If already in parent org, move them to sub-org.
			try {
				await autoJoinMemberInDoconchainOrganization({
					email: targetUser.email,
					name: getFullName(targetUser) || undefined,
					role: "Member",
					organizationIdOverride: created.id,
				})
			} catch (autoJoinErr) {
				const msg = autoJoinErr instanceof Error ? autoJoinErr.message : String(autoJoinErr)
				if (
					(msg.includes("already exist") || msg.includes("already exists")) &&
					created.subOrgNumericId
				) {
					try {
						const members = await getParentOrgMembers()
						const memberId = findParentOrgMemberIdByEmail(members, targetUser.email)
						if (memberId != null) {
							await moveDoconchainMemberToSubOrg({
								memberId,
								targetOrganizationId: created.subOrgNumericId,
								role: "Member",
							})
						}
					} catch {
						// Move failed; sub-org still created and saved below
					}
				} else if (!msg.includes("already exist") && !msg.includes("already exists")) {
					throw autoJoinErr
				}
			}

			await ctx.db
				.update(enpProfiles)
				.set({
					doconchainSubOrgId: created.id,
					doconchainSubOrgName: created.name,
					doconchainSubOrgAddress: subOrgAddress,
					doconchainSubOrgCreatedAt: createdAtIso ? new Date(createdAtIso) : new Date(),
					updatedAt: new Date(),
				})
				.where(eq(enpProfiles.userId, targetUser.id))

			return {
				created: true,
				subOrgId: created.id,
				subOrgName: created.name,
			}
		}),

	// Admin: Transfer credits from Quanby (parent org) to an ENP's sub-org.
	transferCreditsToEnpSubOrganization: protectedProcedure
		.input(transferEnpDoconchainCreditsSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can transfer ENP sub-organization credits.",
				})
			}

			const targetUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
				columns: { id: true, role: true },
			})
			if (!targetUser) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
			}
			if (targetUser.role !== "ENP") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Target user is not an ENP" })
			}

			const enpProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, targetUser.id),
				columns: { doconchainSubOrgId: true },
			})
			if (!enpProfile?.doconchainSubOrgId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "ENP does not have a DocOnChain sub-organization yet.",
				})
			}

			const result = await transferDoconchainCreditsToSubOrg({
				subOrgUuid: enpProfile.doconchainSubOrgId,
				credits: input.credits,
			})

			return {
				success: true,
				subOrgId: enpProfile.doconchainSubOrgId,
				transferredCredits: result.transferredCredits,
				remainingCredits: result.remainingCredits ?? null,
			}
		}),

	// Admin: Clear stored DocOnChain sub-org from ENP profile (e.g. after sub-org was deleted in DocOnChain).
	clearEnpDoconchainSubOrg: protectedProcedure
		.input(clearEnpDoconchainSubOrgSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can clear ENP sub-organization.",
				})
			}

			const targetUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, input.enpId),
				columns: { id: true, role: true },
			})
			if (!targetUser) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
			}
			if (targetUser.role !== "ENP") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Target user is not an ENP" })
			}

			const profile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, targetUser.id),
				columns: { userId: true },
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "ENP profile not found" })
			}

			await ctx.db
				.update(enpProfiles)
				.set({
					doconchainSubOrgId: null,
					doconchainSubOrgName: null,
					doconchainSubOrgAddress: null,
					doconchainSubOrgCreatedAt: null,
					updatedAt: new Date(),
				})
				.where(eq(enpProfiles.userId, targetUser.id))

			return { success: true, enpId: input.enpId }
		}),

	// Get current user's default signature
	getDefaultSignature: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				id: true,
				email: true,
				firstName: true,
				middleName: true,
				lastName: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		// Note: defaultSignature field doesn't exist in schema
		return {
			id: user.id,
			email: user.email,
			name: getFullName(user),
			defaultSignature: null,
			hasDefaultSignature: false,
		}
	}),
})
