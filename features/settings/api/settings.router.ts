import { TRPCError } from "@trpc/server"
import { compare, hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	addPasswordSchema,
	changePasswordSchema,
	toggleTwoFASchema,
} from "@/features/settings/api/settings.schema"

export const settingsRouter = createTRPCRouter({
	changePassword: protectedProcedure
		.input(changePasswordSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { currentPassword, newPassword } = input

			const user = await db.query.users.findFirst({
				where: eq(users.id, session.user.id),
			})

			if (!user) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
			}

			if (!user.password) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "User does not have a password." })
			}

			const isPasswordValid = await compare(currentPassword, user.password)

			if (!isPasswordValid) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password." })
			}

			const hashedNewPassword = await hash(newPassword, 10)

			await db
				.update(users)
				.set({ password: hashedNewPassword })
				.where(eq(users.id, session.user.id))

			return { message: "Password updated successfully." }
		}),

	addPassword: protectedProcedure.input(addPasswordSchema).mutation(async ({ ctx, input }) => {
		const { db, session } = ctx
		const { newPassword } = input

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
		}

		if (user.password) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "User already has a password. Use change password instead.",
			})
		}

		const hashedPassword = await hash(newPassword, 10)

		await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id))

		return { message: "Password added successfully." }
	}),

	checkUserHasPassword: protectedProcedure.query(async ({ ctx }) => {
		const { db, session } = ctx

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
			columns: {
				password: true,
			},
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
		}

		return { hasPassword: !!user.password }
	}),

	toggleTwoFA: protectedProcedure.input(toggleTwoFASchema).mutation(async ({ ctx, input }) => {
		const { db, session } = ctx
		const { enabled } = input

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
		}

		// For now, we'll just update a isTwoFactorEnabled field
		// In a real implementation, you'd generate/remove TOTP secrets
		await db.update(users).set({ isTwoFactorEnabled: enabled }).where(eq(users.id, session.user.id))

		return {
			message: enabled
				? "Two-factor authentication enabled successfully."
				: "Two-factor authentication disabled successfully.",
		}
	}),

	checkTwoFAStatus: protectedProcedure.query(async ({ ctx }) => {
		const { db, session } = ctx

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
			columns: {
				isTwoFactorEnabled: true,
			},
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
		}

		return { twoFactorEnabled: !!user.isTwoFactorEnabled }
	}),
})
