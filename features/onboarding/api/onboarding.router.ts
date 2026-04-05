import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"

import { recoveryEmailVerificationTokens, users } from "@/services/drizzle/schema/auth"
import { sendRecoveryEmailVerification } from "@/services/react-email/lib/send.recovery-email-verification"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/services/trpc/init"

import { generateRecoveryEmailVerificationToken } from "@/features/auth/lib/token"
import {
	submitRecoveryEmailSchema,
	updateAvatarSchema,
	updateProfileSchema,
	verifyRecoveryEmailSchema,
} from "@/features/onboarding/api/onboarding.schemas"

const ONBOARDING_SNOOZE_DAYS = 7

function hasValue(value: string | null | undefined) {
	return Boolean(value && value.trim() !== "")
}

function isOnboardingDetailsComplete(details: {
	phoneNumber?: string | null
	homeStreet?: string | null
	barangay?: string | null
	cityProvince?: string | null
	image?: string | null
}) {
	return (
		hasValue(details.phoneNumber) &&
		hasValue(details.homeStreet) &&
		hasValue(details.barangay) &&
		hasValue(details.cityProvince) &&
		hasValue(details.image)
	)
}

export const onboardingRouter = createTRPCRouter({
	submitRecoveryEmail: protectedProcedure
		.input(submitRecoveryEmailSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { recoveryEmail } = input

			// Recovery email must not be the same as the primary email
			if (recoveryEmail === session.user.email.toLowerCase()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Recovery email must be different from your primary email.",
				})
			}

			// Check if another user already uses this as their recovery email
			const existingRecovery = await db.query.users.findFirst({
				where: (data, { eq, and, ne }) =>
					and(eq(data.recoveryEmail, recoveryEmail), ne(data.id, session.user.id)),
				columns: { id: true },
			})

			if (existingRecovery) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This email is already in use as a recovery email.",
				})
			}

			const currentUser = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.id, session.user.id),
				columns: { recoveryEmail: true, recoveryEmailVerified: true },
			})

			if (
				currentUser?.recoveryEmail === recoveryEmail &&
				currentUser.recoveryEmailVerified === null
			) {
				const token = await generateRecoveryEmailVerificationToken(session.user.email)
				await sendRecoveryEmailVerification(recoveryEmail, token.token)

				return {
					changed: false,
					message: "Verification email resent to your recovery email address.",
				}
			}

			if (
				currentUser?.recoveryEmail === recoveryEmail &&
				currentUser.recoveryEmailVerified !== null
			) {
				return {
					changed: false,
					message: "Recovery email is already verified.",
				}
			}

			// Generate token using the user's primary email (FK to users.email)
			const token = await generateRecoveryEmailVerificationToken(session.user.email)

			// Store the recovery email on the user (unverified)
			await db
				.update(users)
				.set({ recoveryEmail, recoveryEmailVerified: null })
				.where(eq(users.id, session.user.id))

			// Send verification email to the recovery address
			await sendRecoveryEmailVerification(recoveryEmail, token.token)

			return {
				changed: true,
				message: "Verification email sent to your recovery email address.",
			}
		}),

	verifyRecoveryEmail: publicProcedure
		.input(verifyRecoveryEmailSchema)
		.mutation(async ({ ctx, input }) => {
			const { db } = ctx
			const { token } = input

			// Decode the token in case it's URL encoded
			const decodedToken = decodeURIComponent(token)
			const rawTrimmed = token.trim()
			const decodedTrimmed = decodedToken.trim()

			const existingToken = await db.query.recoveryEmailVerificationTokens.findFirst({
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
					message: "Verification token not found or has already been used.",
				})
			}

			const tokenHasExpired = new Date(existingToken.expires) < new Date()
			if (tokenHasExpired) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Verification token has expired. Please request a new one.",
				})
			}

			// Look up the user by primary email (the FK in the token table)
			const user = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.email, existingToken.email),
				columns: {
					id: true,
					recoveryEmail: true,
					recoveryEmailVerified: true,
					onboardingCompletedAt: true,
				},
			})

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found.",
				})
			}

			// Check if already verified
			if (user.recoveryEmailVerified) {
				// Delete the token anyway
				await db
					.delete(recoveryEmailVerificationTokens)
					.where(eq(recoveryEmailVerificationTokens.id, existingToken.id))

				return {
					alreadyVerified: true,
					onboardingComplete: !!user.onboardingCompletedAt,
				}
			}

			// Mark recovery email as verified
			await db.update(users).set({ recoveryEmailVerified: new Date() }).where(eq(users.id, user.id))

			// Delete the consumed token
			await db
				.delete(recoveryEmailVerificationTokens)
				.where(eq(recoveryEmailVerificationTokens.id, existingToken.id))

			return {
				alreadyVerified: false,
				onboardingComplete: !!user.onboardingCompletedAt,
			}
		}),

	updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
		const { db, session } = ctx

		const existingUser = await db.query.users.findFirst({
			where: (data, { eq }) => eq(data.id, session.user.id),
			columns: {
				image: true,
				firstName: true,
				middleName: true,
				lastName: true,
				phoneNumber: true,
				homeStreet: true,
				barangay: true,
				cityProvince: true,
				onboardingDetailsCompletedAt: true,
			},
		})

		if (!existingUser) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found." })
		}

		const firstName =
			input.firstName && input.firstName.trim() !== "" ? input.firstName.trim() : undefined
		const middleName =
			input.middleName && input.middleName.trim() !== "" ? input.middleName.trim() : undefined
		const lastName =
			input.lastName && input.lastName.trim() !== "" ? input.lastName.trim() : undefined

		const phoneNumber =
			input.phoneNumber && input.phoneNumber.trim() !== "" ? input.phoneNumber : null
		const homeStreet = input.homeStreet && input.homeStreet.trim() !== "" ? input.homeStreet : null
		const barangay = input.barangay && input.barangay.trim() !== "" ? input.barangay : null
		const cityProvince =
			input.cityProvince && input.cityProvince.trim() !== "" ? input.cityProvince : null

		const detailsComplete = isOnboardingDetailsComplete({
			phoneNumber,
			homeStreet,
			barangay,
			cityProvince,
			image: existingUser.image,
		})

		const noChange =
			(firstName ?? existingUser.firstName) === existingUser.firstName &&
			(middleName ?? existingUser.middleName) === existingUser.middleName &&
			(lastName ?? existingUser.lastName) === existingUser.lastName &&
			phoneNumber === existingUser.phoneNumber &&
			homeStreet === existingUser.homeStreet &&
			barangay === existingUser.barangay &&
			cityProvince === existingUser.cityProvince &&
			detailsComplete === !!existingUser.onboardingDetailsCompletedAt

		if (noChange) {
			return { changed: false, message: "No changes detected." }
		}

		await db
			.update(users)
			.set({
				...(firstName !== undefined ? { firstName } : {}),
				...(middleName !== undefined ? { middleName } : {}),
				...(lastName !== undefined ? { lastName } : {}),
				phoneNumber,
				homeStreet,
				barangay,
				cityProvince,
				onboardingDetailsCompletedAt: detailsComplete ? new Date() : null,
				...(detailsComplete ? { onboardingSnoozedUntil: null } : {}),
			})
			.where(eq(users.id, session.user.id))

		return { changed: true, message: "Profile updated successfully." }
	}),

	updateAvatar: protectedProcedure.input(updateAvatarSchema).mutation(async ({ ctx, input }) => {
		const { db, session } = ctx

		const existingUser = await db.query.users.findFirst({
			where: (data, { eq }) => eq(data.id, session.user.id),
			columns: {
				phoneNumber: true,
				homeStreet: true,
				barangay: true,
				cityProvince: true,
				image: true,
				onboardingDetailsCompletedAt: true,
			},
		})

		if (!existingUser) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found." })
		}

		const detailsComplete = isOnboardingDetailsComplete({
			phoneNumber: existingUser.phoneNumber,
			homeStreet: existingUser.homeStreet,
			barangay: existingUser.barangay,
			cityProvince: existingUser.cityProvince,
			image: input.imagePath,
		})

		if (
			existingUser.image === input.imagePath &&
			detailsComplete === !!existingUser.onboardingDetailsCompletedAt
		) {
			return { changed: false, message: "No changes detected." }
		}

		await db
			.update(users)
			.set({
				image: input.imagePath,
				onboardingDetailsCompletedAt: detailsComplete ? new Date() : null,
				...(detailsComplete ? { onboardingSnoozedUntil: null } : {}),
			})
			.where(eq(users.id, session.user.id))

		return { changed: true, message: "Avatar updated successfully." }
	}),

	completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
		const { db, session } = ctx

		const existingUser = await db.query.users.findFirst({
			where: (data, { eq }) => eq(data.id, session.user.id),
			columns: {
				phoneNumber: true,
				homeStreet: true,
				barangay: true,
				cityProvince: true,
				image: true,
			},
		})

		const detailsComplete = isOnboardingDetailsComplete({
			phoneNumber: existingUser?.phoneNumber,
			homeStreet: existingUser?.homeStreet,
			barangay: existingUser?.barangay,
			cityProvince: existingUser?.cityProvince,
			image: existingUser?.image,
		})

		await db
			.update(users)
			.set({
				onboardingCompletedAt: new Date(),
				onboardingDetailsCompletedAt: detailsComplete ? new Date() : null,
				...(detailsComplete ? { onboardingSnoozedUntil: null } : {}),
			})
			.where(eq(users.id, session.user.id))

		return {
			message: "Onboarding completed successfully.",
			onboardingComplete: true,
			onboardingDetailsComplete: detailsComplete,
		}
	}),

	snoozeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
		const { db, session } = ctx

		const snoozedUntil = new Date(Date.now() + ONBOARDING_SNOOZE_DAYS * 24 * 60 * 60 * 1000)

		await db
			.update(users)
			.set({ onboardingSnoozedUntil: snoozedUntil })
			.where(eq(users.id, session.user.id))

		return {
			message: `Onboarding reminders snoozed for ${ONBOARDING_SNOOZE_DAYS} days.`,
			snoozedUntil,
		}
	}),

	getStatus: protectedProcedure.query(async ({ ctx }) => {
		const { db, session } = ctx

		const user = await db.query.users.findFirst({
			where: (data, { eq }) => eq(data.id, session.user.id),
			columns: {
				onboardingCompletedAt: true,
				onboardingDetailsCompletedAt: true,
				onboardingSnoozedUntil: true,
				recoveryEmail: true,
				recoveryEmailVerified: true,
				phoneNumber: true,
				homeStreet: true,
				barangay: true,
				cityProvince: true,
				image: true,
			},
		})

		if (!user) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found." })
		}

		const detailsComplete = isOnboardingDetailsComplete({
			phoneNumber: user.phoneNumber,
			homeStreet: user.homeStreet,
			barangay: user.barangay,
			cityProvince: user.cityProvince,
			image: user.image,
		})

		return {
			onboardingCompletedAt: user.onboardingCompletedAt,
			onboardingDetailsCompletedAt: user.onboardingDetailsCompletedAt,
			onboardingSnoozedUntil: user.onboardingSnoozedUntil,
			isDetailsComplete: detailsComplete,
			recoveryEmail: user.recoveryEmail,
			recoveryEmailVerified: user.recoveryEmailVerified,
			phoneNumber: user.phoneNumber,
			homeStreet: user.homeStreet,
			barangay: user.barangay,
			cityProvince: user.cityProvince,
			image: user.image,
		}
	}),
})
