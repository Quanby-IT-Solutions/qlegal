import { TRPCError } from "@trpc/server"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { formatDateForStamp } from "@/core/lib/format-date-for-stamp"

import { passwordResetTokens, users, verificationTokens } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { sendPasswordResetToken } from "@/services/react-email/lib/send.password-reset-token"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import {
	forgotPasswordSchema,
	lawyerRegisterSchema,
	registerSchema,
	resetPasswordSchema,
	verifyEmailSchema,
} from "@/features/auth/api/auth.schemas"
import { generatePasswordResetToken, generateVerificationToken } from "@/features/auth/lib/token"

/**
 * Mask an email address for display: first char + asterisks + last char before @, full domain.
 * e.g. "recovery@gmail.com" → "r******y@gmail.com"
 */
function maskEmail(email: string): string {
	const [local, domain] = email.split("@")
	if (!local || !domain) return email
	if (local.length <= 2) return `${local[0]}***@${domain}`
	return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export const authRouter = createTRPCRouter({
	register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
		const { email, password, firstName, middleName, lastName, prefix, suffix } = input

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
				firstName,
				middleName: middleName ?? null,
				lastName,
				prefix: prefix ?? null,
				suffix: suffix ?? null,
				email,
				password: hashedPassword,
				commissionStatus: "PENDING",
			})
			.returning({ id: users.id })

		if (!createdUser?.id) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create user.",
			})
		}

		// DocOnChain org membership is added on first login, not at registration.

		const verificationToken = await generateVerificationToken(email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

		return { message: "Confirmation email sent." }
	}),

	registerLawyer: publicProcedure.input(lawyerRegisterSchema).mutation(async ({ ctx, input }) => {
		const { firstName, middleName, lastName, email, password, seal, notaryInfo } = input

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
						firstName,
						middleName: middleName ?? null,
						lastName,
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

		// Format attorney name for seal: "ATTY." prefix and uppercase
		const formatAttorneyNameForSeal = (n: string | null | undefined): string => {
			const base = (n ?? "").trim()
			if (!base) return ""
			const upper = base.toUpperCase()
			return upper.startsWith("ATTY.") ? upper : `ATTY. ${upper}`
		}
		const attyNameForSeal = formatAttorneyNameForSeal(notaryInfo.attyName ?? seal.enpName)
		const enpNameForSeal = formatAttorneyNameForSeal(seal.enpName)
		// Seal expects "In-person" or "Remote"; REN = Remote (video), IEN = In-person
		const modeRaw = (notaryInfo.modeOfNotarization ?? "").trim().toUpperCase()
		const modeOfNotarization = modeRaw === "REN" || modeRaw === "REMOTE" ? "Remote" : "In-person"

		// Generate document_stamp payload for external API (send both snake_case and camelCase for DocOnChain)
		const documentStamp = {
			seal: {
				type: "seal",
				enp_name: enpNameForSeal,
				enpName: enpNameForSeal,
				enp_role_number: seal.enpRollNumber,
			},
			notary_info: {
				type: "notary",
				name: attyNameForSeal,
				commission_number: notaryInfo.commissionNo ?? "",
				atty_name: attyNameForSeal,
				attyName: attyNameForSeal,
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
				mode_of_notarization: modeOfNotarization,
				modeOfNotarization,
			},
		}

		// DocOnChain org membership is added on first login, not at registration.

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
			columns: { id: true, email: true },
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

	forgotPasswordViaRecovery: publicProcedure
		.input(forgotPasswordSchema)
		.mutation(async ({ ctx, input }) => {
			const { email } = input

			const user = await ctx.db.query.users.findFirst({
				where: (data, { eq }) => eq(data.email, email),
				columns: {
					id: true,
					email: true,
					recoveryEmail: true,
					recoveryEmailVerified: true,
				},
			})

			// Generic error for all failure cases to prevent account enumeration
			if (!user?.recoveryEmail || !user?.recoveryEmailVerified) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No recovery email is set up for this account. Please contact support.",
				})
			}

			// Generate a password reset token for the user's primary email
			const passwordResetToken = await generatePasswordResetToken(email)

			// Send the reset email to the recovery address (not primary)
			await sendPasswordResetToken(user.recoveryEmail, passwordResetToken.token)

			return {
				message: "Password reset email sent to your recovery email.",
				maskedRecoveryEmail: maskEmail(user.recoveryEmail),
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

		// Decode the token in case it's URL encoded; try both raw and decoded for lookup
		const decodedToken = decodeURIComponent(token)
		const rawTrimmed = token.trim()
		const decodedTrimmed = decodedToken.trim()

		const existingToken = await ctx.db.query.verificationTokens.findFirst({
			where: (data, { eq, or }) =>
				or(
					eq(data.token, rawTrimmed),
					eq(data.token, decodedTrimmed),
					eq(data.token, token),
					eq(data.token, decodedToken)
				),
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
