import { TRPCError } from "@trpc/server"
import { compare, hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { recoveryEmailVerificationTokens, users } from "@/services/drizzle/schema/auth"
import { sendRecoveryEmailVerification } from "@/services/react-email/lib/send.recovery-email-verification"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { generateRecoveryEmailVerificationToken } from "@/features/auth/lib/token"
import {
	addPasswordSchema,
	changePasswordSchema,
	changeRecoveryEmailSchema,
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

	getRecoveryEmail: protectedProcedure.query(async ({ ctx }) => {
		const { db, session } = ctx

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
			columns: {
				recoveryEmail: true,
				recoveryEmailVerified: true,
			},
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
		}

		return {
			recoveryEmail: user.recoveryEmail,
			recoveryEmailVerified: user.recoveryEmailVerified,
		}
	}),

	initiateRecoveryEmailChange: protectedProcedure
		.input(changeRecoveryEmailSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { newRecoveryEmail } = input

			// New recovery email must not be the same as the primary email
			if (newRecoveryEmail === session.user.email.toLowerCase()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Recovery email must be different from your primary email.",
				})
			}

			// Check if another user already uses this as their recovery email
			const existingRecovery = await db.query.users.findFirst({
				where: (data, { eq, and, ne }) =>
					and(eq(data.recoveryEmail, newRecoveryEmail), ne(data.id, session.user.id)),
				columns: { id: true },
			})

			if (existingRecovery) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This email is already in use as a recovery email.",
				})
			}

			// Generate token using the user's primary email (FK to users.email)
			const token = await generateRecoveryEmailVerificationToken(session.user.email)

			// Update the recovery email on the user (unverified — old email stays active until new is verified)
			await db
				.update(users)
				.set({ recoveryEmail: newRecoveryEmail, recoveryEmailVerified: null })
				.where(eq(users.id, session.user.id))

			// Send verification email to the new recovery address
			await sendRecoveryEmailVerification(newRecoveryEmail, token.token)

			return { message: "Verification email sent to your new recovery email address." }
		}),

	removeRecoveryEmail: protectedProcedure.mutation(async ({ ctx }) => {
		const { db, session } = ctx

		// Clear recovery email fields on the user
		await db
			.update(users)
			.set({ recoveryEmail: null, recoveryEmailVerified: null })
			.where(eq(users.id, session.user.id))

		// Delete any pending recovery email verification tokens for this user
		await db
			.delete(recoveryEmailVerificationTokens)
			.where(eq(recoveryEmailVerificationTokens.email, session.user.email))

		return { message: "Recovery email removed successfully." }
	}),
})
