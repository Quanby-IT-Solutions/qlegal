import { TRPCError } from "@trpc/server"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { formatDateForStamp } from "@/core/lib/format-date-for-stamp"
import { passwordResetTokens, users, verificationTokens } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { sendPasswordResetToken } from "@/services/react-email/lib/send.password-reset-token"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"
import { autoJoinMemberInDoconchainOrganization } from "@/services/doconchain/organization/auto-join-member"

import {
	forgotPasswordSchema,
	lawyerRegisterSchema,
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

		// Create user record first; if DocoChain provisioning fails we clean this up.
		const [createdUser] = await ctx.db
			.insert(users)
			.values({
				name,
				email,
				password: hashedPassword,
			})
			.returning({ id: users.id })

		if (!createdUser?.id) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create user.",
			})
		}

		try {
			await autoJoinMemberInDoconchainOrganization({ email, name, role: "Member" })
		} catch (error) {
			// If external provisioning fails, clean up the created user so retry is safe.
			await ctx.db.delete(users).where(eq(users.id, createdUser.id)).catch(() => undefined)
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					error instanceof Error
						? `Failed to provision DocOnChain access: ${error.message}`
						: "Failed to provision DocOnChain access.",
			})
		}

		const verificationToken = await generateVerificationToken(email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

		return { message: "Confirmation email sent." }
	}),

	registerLawyer: publicProcedure.input(lawyerRegisterSchema).mutation(async ({ ctx, input }) => {
		const { name, email, password, seal, notaryInfo } = input

		// Check if user already exists
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

		let newUserId: string | undefined
		try {
			await ctx.db.transaction(async tx => {
				const [newUser] = await tx
					.insert(users)
					.values({
						name,
						email,
						password: hashedPassword,
						role: "ENP",
						commissionStatus: "PENDING",
					})
					.returning({ id: users.id })

				if (!newUser?.id) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create user account.",
					})
				}
				newUserId = newUser.id

				// Store dates in human-readable form so document seals never receive raw ISO
				await tx.insert(enpProfiles).values({
					userId: newUser.id,
					// Notary info (roll no from seal)
					rollNo: seal.enpRollNumber,
					rollNoDate: formatDateForStamp(seal.rollNoDate) || seal.rollNoDate,
					commissionNo: notaryInfo.commissionNo,
					commissionNoValidUntil:
						formatDateForStamp(notaryInfo.commissionNoValidUntil) ||
						notaryInfo.commissionNoValidUntil,
					ptrNo: notaryInfo.ptrNo,
					ptrNoLocation: notaryInfo.ptrNoLocation,
					ptrNoDate: formatDateForStamp(notaryInfo.ptrNoDate) || notaryInfo.ptrNoDate,
					ibpNo: notaryInfo.ibpNo,
					ibpNoDate: formatDateForStamp(notaryInfo.ibpNoDate) || notaryInfo.ibpNoDate,
					notaryAddress: notaryInfo.notaryAddress,
					mcleNoPeriod: notaryInfo.mcleNoPeriod,
					mcleNo: notaryInfo.mcleNo,
					mcleNoDate: formatDateForStamp(notaryInfo.mcleNoDate) || notaryInfo.mcleNoDate,
					isAvailable: true,
				})
			})
		} catch {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Failed to submit ENP application. Please double-check your credentials and try again.",
			})
		}

		// Generate document_stamp payload for external API
		const documentStamp = {
			seal: {
				type: "seal",
				enp_name: seal.enpName,
				enp_role_number: seal.enpRollNumber,
			},
			notary_info: {
				type: "notary",
				atty_name: notaryInfo.attyName,
				roll_no: seal.enpRollNumber,
				roll_no_date: formatDateForStamp(seal.rollNoDate),
				commission_no: notaryInfo.commissionNo,
				commission_no_valid_until: formatDateForStamp(notaryInfo.commissionNoValidUntil),
				PTR_no: notaryInfo.ptrNo,
				PTR_no_location: notaryInfo.ptrNoLocation,
				PTR_no_date: formatDateForStamp(notaryInfo.ptrNoDate),
				IBP_no: notaryInfo.ibpNo,
				IBP_no_date: formatDateForStamp(notaryInfo.ibpNoDate),
				email: notaryInfo.notaryEmail,
				address: notaryInfo.notaryAddress,
				// MCLE period should be a period label (e.g. "VIII"). Never leak ISO timestamps into seals.
				MCLE_no_period:
					typeof notaryInfo.mcleNoPeriod === "string" &&
					/^\d{4}-\d{2}-\d{2}T/.test(notaryInfo.mcleNoPeriod.trim())
						? ""
						: notaryInfo.mcleNoPeriod,
				MCLE_no: notaryInfo.mcleNo,
				MCLE_no_date: formatDateForStamp(notaryInfo.mcleNoDate),
				mode_of_notarization: notaryInfo.modeOfNotarization,
			},
		}

		try {
			await autoJoinMemberInDoconchainOrganization({ email, name, role: "Member" })
		} catch (error) {
			// Try to clean up the created ENP user so retry is safe.
			if (newUserId) {
				await ctx.db
					.delete(enpProfiles)
					.where(eq(enpProfiles.userId, newUserId))
					.catch(() => undefined)
				await ctx.db.delete(users).where(eq(users.id, newUserId)).catch(() => undefined)
			}
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					error instanceof Error
						? `Failed to provision DocOnChain access: ${error.message}`
						: "Failed to provision DocOnChain access.",
			})
		}

		// Send verification email
		const verificationToken = await generateVerificationToken(email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

		return {
			message:
				"Registration successful! Please verify your email. Your application will be reviewed by an administrator.",
			documentStamp, // Return for debugging/confirmation
			userId: newUserId,
		}
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
			console.log(
				"   - Recent tokens in DB:",
				allTokens.map(t => ({ email: t.email, token: `${t.token?.substring(0, 10)}...` }))
			)

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
