import { TRPCError } from "@trpc/server"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { users, verificationTokens } from "@/services/drizzle/schema/auth"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import {
	forgotPasswordSchema,
	registerSchema,
	resetPasswordSchema,
	verifyEmailSchema,
} from "@/features/auth/api/auth.schemas"
import { generateVerificationToken } from "@/features/auth/lib/token"

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

		const verificationToken = await generateVerificationToken(email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

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

	verifyEmail: publicProcedure.input(verifyEmailSchema).mutation(async ({ ctx, input }) => {
		const { token } = input
		if (!token) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No verification token provided.",
			})
		}

		const existingToken = await ctx.db.query.verificationTokens.findFirst({
			where: (data, { eq }) => eq(data.token, token),
		})
		if (!existingToken) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Verification token not found.",
			})
		}

		const tokenHasExpired = new Date(existingToken.expires) < new Date()
		if (tokenHasExpired) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Verification token has expired.",
			})
		}

		const existingUser = await ctx.db.query.users.findFirst({
			where: (data, { eq }) => eq(data.email, existingToken.email),
		})
		if (!existingUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User with this email not found.",
			})
		}

		await ctx.db
			.update(users)
			.set({
				emailVerified: new Date(),
				email: existingToken.email,
			})
			.where(eq(users.id, existingUser.id))

		await ctx.db.delete(verificationTokens).where(eq(verificationTokens.id, existingToken.id))

		return { message: "Email verified!" }
	}),
})
