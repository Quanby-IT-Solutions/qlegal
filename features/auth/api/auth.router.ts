import { TRPCError } from "@trpc/server"
import { hash } from "bcrypt"

import { users } from "@/services/drizzle/schema/auth"
import { emailService } from "@/services/email/service"
import { prepareTwoFactorEmail } from "@/services/email/templates/two-factor-auth/service"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import {
	forgotPasswordSchema,
	registerSchema,
	resetPasswordSchema,
} from "@/features/auth/api/auth.schemas"

export const authRouter = createTRPCRouter({
	register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
		const { name, email, password } = input

		const existingUser = await ctx.db.query.users.findFirst({
			where: (data, { eq }) => eq(data.email, email),
		})

		if (existingUser) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "User with this email already exists.",
			})
		}

		const hashedPassword = await hash(password, 10)

		await ctx.db.insert(users).values({
			name,
			email,
			password: hashedPassword,
		})

		return { message: "Confirmation email sent." }
	}),

	forgotPassword: publicProcedure.input(forgotPasswordSchema).mutation(async ({ ctx, input }) => {
		const { email } = input

		const user = await ctx.db.query.users.findFirst({
			where: (data, { eq }) => eq(data.email, email),
			columns: { id: true, email: true, name: true },
		})

		// Always return success to prevent email enumeration
		if (!user?.email) {
			return {
				success: true,
				message: "If an account exists, a password reset code has been sent to your email",
			}
		}

		try {
			// Generate verification code
			const code = Math.floor(100000 + Math.random() * 900000).toString()
			const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

			// Store code in database
			await ctx.db.twoFactorCode.create({
				data: {
					userId: user.id,
					code,
					expires,
					purpose: "PASSWORD_RESET",
				},
			})

			// Send email with code using existing template
			const emailData = await prepareTwoFactorEmail({
				user: {
					name: user.name,
					email: user.email,
				},
				code,
				type: "reset",
			})

			await emailService.sendEmail(emailData)

			return {
				success: true,
				message: "If an account exists, a password reset code has been sent to your email",
				hasRecoveryEmail: !!user.recoveryEmail,
			}
		} catch (error) {
			console.error("Failed to send password reset code:", error)
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to process password reset request",
			})
		}
	}),

	forgotPasswordRecovery: publicProcedure
		.input(forgotPasswordSchema)
		.mutation(async ({ ctx, input }) => {
			const { email } = input

			const user = await ctx.db.user.findUnique({
				where: { email },
				select: { id: true, email: true, name: true, recoveryEmail: true },
			})

			// Always return success to prevent email enumeration
			if (!user?.recoveryEmail) {
				return {
					success: true,
					message: "If a recovery email exists, a password reset code has been sent",
				}
			}

			const recoveryEmail = user.recoveryEmail

			try {
				// Generate verification code
				const code = Math.floor(100000 + Math.random() * 900000).toString()
				const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

				// Store code in database
				await ctx.db.twoFactorCode.create({
					data: {
						userId: user.id,
						code,
						expires,
						purpose: "PASSWORD_RESET",
					},
				})

				// Send email with code to recovery email
				const emailData = await prepareTwoFactorEmail({
					user: {
						name: user.name,
						email: recoveryEmail,
					},
					code,
					type: "reset",
				})

				await emailService.sendEmail(emailData)

				return {
					success: true,
					message: "If a recovery email exists, a password reset code has been sent",
				}
			} catch (error) {
				console.error("Failed to send password reset code to recovery email:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to process password reset request",
				})
			}
		}),

	resetPassword: publicProcedure.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
		const { email, code, newPassword } = input

		// Find user
		const user = await ctx.db.user.findUnique({
			where: { email },
			select: { id: true, email: true, name: true },
		})

		if (!user?.email) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid email or code",
			})
		} // Find valid code
		const twoFactorCode = await ctx.db.twoFactorCode.findFirst({
			where: {
				userId: user.id,
				code,
				used: false,
				expires: { gt: new Date() },
				purpose: "PASSWORD_RESET",
			},
		})

		if (!twoFactorCode) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid or expired reset code",
			})
		}

		// Hash new password
		const hashedPassword = await hash(newPassword, 10)

		// Update password and mark code as used
		await ctx.db.$transaction([
			ctx.db.user.update({
				where: { id: user.id },
				data: { password: hashedPassword },
			}),
			ctx.db.twoFactorCode.update({
				where: { id: twoFactorCode.id },
				data: { used: true },
			}),
			// Clean up old reset codes for this user
			ctx.db.twoFactorCode.deleteMany({
				where: {
					userId: user.id,
					OR: [{ used: true }, { expires: { lt: new Date() } }],
				},
			}),
		])

		return {
			success: true,
			message: "Password has been reset successfully. You can now log in with your new password.",
		}
	}),
})
