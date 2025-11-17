import { TRPCError } from "@trpc/server"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { passwordResetTokens, users, verificationTokens } from "@/services/drizzle/schema/auth"
import { sendPasswordResetToken } from "@/services/react-email/lib/send.password-reset-token"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"
import { autoJoinOrganization } from "@/services/docochain"

import {
	forgotPasswordSchema,
	registerSchema,
	resetPasswordSchema,
	verifyEmailSchema,
} from "@/features/auth/api/auth.schemas"
import { generatePasswordResetToken, generateVerificationToken } from "@/features/auth/lib/token"

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

		// Auto-join user to DocoChain organization
		// This makes them an organization member so they can use DocoChain features
		try {
			const nameParts = name.split(" ")
			const firstName = nameParts[0] || "User"
			const lastName = nameParts.slice(1).join(" ") || ""

			await autoJoinOrganization({
				email,
				firstName,
				lastName,
				role: "Member",
			})
			console.log("✅ User auto-joined to DocoChain organization")
		} catch (error) {
			// Don't fail registration if auto-join fails
			console.warn("⚠️ Failed to auto-join user to DocoChain organization:", error)
		}

		const verificationToken = await generateVerificationToken(email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

		return { message: "Confirmation email sent." }
	}),

	forgotPassword: publicProcedure.input(forgotPasswordSchema).mutation(async ({ ctx, input }) => {
		const { email } = input

		const existingUser = await ctx.db.query.users.findFirst({
			where: (data, { eq }) => eq(data.email, email),
			columns: { id: true, email: true, name: true },
		})

		if (!existingUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User with this email not found.",
			})
		}

		const passwordResetToken = await generatePasswordResetToken(email)
		await sendPasswordResetToken(passwordResetToken.email, passwordResetToken.token)

		return { message: "Password reset email sent!" }
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
		const { newPassword, token } = input

		if (!token) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No verification token provided.",
			})
		}

		const existingToken = await ctx.db.query.passwordResetTokens.findFirst({
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

		const hashedPassword = await hash(newPassword, 10)

		await ctx.db
			.update(users)
			.set({ password: hashedPassword })
			.where(eq(users.id, existingUser.id))

		await ctx.db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, existingToken.id))

		return { message: "Password updated!" }
	}),

	verifyEmail: publicProcedure.input(verifyEmailSchema).mutation(async ({ ctx, input }) => {
		const { token } = input
		if (!token) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No verification token provided.",
			})
		}

		// Decode the token in case it's URL encoded
		const decodedToken = decodeURIComponent(token)

		console.log("🔵 Verifying email token...")
		console.log("   - Token (raw):", token)
		console.log("   - Token (decoded):", decodedToken)

		const existingToken = await ctx.db.query.verificationTokens.findFirst({
			where: (data, { eq }) => eq(data.token, decodedToken),
		})

		if (!existingToken) {
			console.error("❌ Verification token not found in database")
			// Try to find by email to help debug
			const allTokens = await ctx.db.query.verificationTokens.findMany({
				limit: 5,
			})
			console.log("   - Recent tokens in DB:", allTokens.map(t => ({ email: t.email, token: t.token?.substring(0, 10) + "..." })))
			
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
