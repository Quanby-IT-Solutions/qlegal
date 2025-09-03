import { TRPCError } from "@trpc/server"
import { hash } from "bcryptjs"

import { users } from "@/services/drizzle/schema/auth"
// import { emailService } from "@/services/email/service"
// import { prepareTwoFactorEmail } from "@/services/email/templates/two-factor-auth/service"
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
	}),

	forgotPasswordRecovery: publicProcedure
		.input(forgotPasswordSchema)
		.mutation(async ({ ctx, input }) => {
			const { email } = input

			const user = await ctx.db.query.users.findFirst({
				where: (data, { eq }) => eq(data.email, email),
				columns: { id: true, email: true, name: true },
			})

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				})
			}
		}),

	resetPassword: publicProcedure.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
		// const { email, code, newPassword } = input
		const { email } = input

		// Find user
		const user = await ctx.db.query.users.findFirst({
			where: (data, { eq }) => eq(data.email, email),
			columns: { id: true, email: true, name: true },
		})

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			})
		}
	}),
})
