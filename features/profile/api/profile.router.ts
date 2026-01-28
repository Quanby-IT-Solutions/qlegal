import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { logError } from "@/core/middleware/logger"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { deleteAvatar } from "@/features/profile/api/profile.actions"
import {
	addressSchema,
	certificationsSchema,
	enpProfileSchema,
	lawyerPricingSchema,
	licensingSchema,
	personalInformationSchema,
	rollRegistrationSchema,
} from "@/features/profile/api/profile.schema"

export const profileRouter = createTRPCRouter({
	updateAvatar: protectedProcedure
		.input(
			z.object({
				imagePath: z.string().min(1, "Image path is required"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { imagePath } = input

			try {
				const currentUser = await db.query.users.findFirst({
					where: eq(users.id, session.user.id),
					columns: { image: true },
				})

				const previousPath = currentUser?.image
				// Only delete if it's a Supabase storage path, not an external URL (like Google SSO)
				if (previousPath && previousPath !== imagePath && !previousPath.startsWith("http")) {
					try {
						await deleteAvatar(previousPath)
					} catch (err) {
						// Log non-fatal deletion errors and continue.
						logError(err, "profile:updateAvatar:deletePrevious")
					}
				}
			} catch (err) {
				logError(err, "profile:updateAvatar:precheck")
			}

			// Update the user's image path in the database
			const [updatedUser] = await db
				.update(users)
				.set({ image: imagePath })
				.where(eq(users.id, session.user.id))
				.returning()

			if (!updatedUser) {
				throw new Error("Failed to update user avatar")
			}

			return {
				success: true,
				user: updatedUser,
			}
		}),

	getSummary: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
			columns: {
				name: true,
			},
		})

		return {
			organization: user?.name ?? "",
		}
	}),

	getPersonalInformation: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
			columns: {
				name: true,
				email: true,
				phoneNumber: true,
			},
		})

		return {
			name: user?.name ?? "",
			email: user?.email ?? "",
			phoneNumber: user?.phoneNumber ?? "",
		}
	}),

	updatePersonalInformation: protectedProcedure
		.input(personalInformationSchema)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db
				.update(users)
				.set({
					name: input.name,
					email: input.email,
					phoneNumber:
						input.phoneNumber && input.phoneNumber.trim() !== "" ? input.phoneNumber : null,
				})
				.where(eq(users.id, ctx.session.user.id))
				.returning()

			return { message: "Personal information updated successfully", user }
		}),

	getEnpProfile: protectedProcedure.query(async ({ ctx }) => {
		const enpProfile = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, ctx.session.user.id),
		})

		if (!enpProfile) {
			return null
		}

		return {
			// Notary Seal Info
			enpName: (enpProfile.enpName as string | null) ?? "",
			enpRoleNumber: (enpProfile.enpRoleNumber as string | null) ?? "",
			rollNo: (enpProfile.rollNo as string | null) ?? "",
			rollNoDate: (enpProfile.rollNoDate as string | null) ?? "",

			// Credentials
			attyName: (enpProfile.attyName as string | null) ?? "",
			commissionNo: (enpProfile.commissionNo as string | null) ?? "",
			commissionNoValidUntil: (enpProfile.commissionNoValidUntil as string | null) ?? "",
			ptrNo: (enpProfile.ptrNo as string | null) ?? "",
			ptrNoLocation: (enpProfile.ptrNoLocation as string | null) ?? "",
			ptrNoDate: (enpProfile.ptrNoDate as string | null) ?? "",
			ibpNo: (enpProfile.ibpNo as string | null) ?? "",
			ibpNoDate: (enpProfile.ibpNoDate as string | null) ?? "",
			notaryEmail: (enpProfile.notaryEmail as string | null) ?? "",
			notaryAddress: (enpProfile.notaryAddress as string | null) ?? "",
			mcleNoPeriod: (enpProfile.mcleNoPeriod as string | null) ?? "",
			mcleNo: (enpProfile.mcleNo as string | null) ?? "",
			mcleNoDate: (enpProfile.mcleNoDate as string | null) ?? "",
			modeOfNotarization: (enpProfile.modeOfNotarization as string | null) ?? "",

			// Pricing
			consultationPrice: enpProfile.consultationPrice ?? null,
			acknowledgmentPrice: enpProfile.acknowledgmentPrice ?? null,
			affirmationPrice: enpProfile.affirmationPrice ?? null,
			juratPrice: enpProfile.juratPrice ?? null,
			signatureWitnessingPrice: enpProfile.signatureWitnessingPrice ?? null,
		}
	}),

	updateEnpProfile: protectedProcedure.input(enpProfileSchema).mutation(async ({ ctx, input }) => {
		const existingProfile = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, ctx.session.user.id),
		})

		const normalizeString = (value: string | undefined): string | null => {
			if (value === undefined) return null
			const trimmed = value.trim()
			return trimmed === "" ? null : trimmed
		}

		const profileData = {
			enpName: normalizeString(input.enpName),
			enpRoleNumber: normalizeString(input.enpRoleNumber),
			rollNo: normalizeString(input.rollNo),
			rollNoDate: normalizeString(input.rollNoDate),
			attyName: normalizeString(input.attyName),
			commissionNo: normalizeString(input.commissionNo),
			commissionNoValidUntil: normalizeString(input.commissionNoValidUntil),
			ptrNo: normalizeString(input.ptrNo),
			ptrNoLocation: normalizeString(input.ptrNoLocation),
			ptrNoDate: normalizeString(input.ptrNoDate),
			ibpNo: normalizeString(input.ibpNo),
			ibpNoDate: normalizeString(input.ibpNoDate),
			notaryEmail: normalizeString(input.notaryEmail),
			notaryAddress: normalizeString(input.notaryAddress),
			mcleNoPeriod: normalizeString(input.mcleNoPeriod),
			mcleNo: normalizeString(input.mcleNo),
			mcleNoDate: normalizeString(input.mcleNoDate),
			modeOfNotarization: normalizeString(input.modeOfNotarization),
		}

		if (existingProfile) {
			await ctx.db
				.update(enpProfiles)
				.set(profileData)
				.where(eq(enpProfiles.userId, ctx.session.user.id))
		} else {
			await ctx.db.insert(enpProfiles).values({
				userId: ctx.session.user.id,
				...profileData,
			})
		}

		return { message: "ENP profile updated successfully" }
	}),

	updateRollRegistration: protectedProcedure
		.input(rollRegistrationSchema)
		.mutation(async ({ ctx, input }) => {
			const existingProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, ctx.session.user.id),
			})

			const normalizeString = (value: string | undefined): string | null => {
				if (value === undefined) return null
				const trimmed = value.trim()
				return trimmed === "" ? null : trimmed
			}

			const profileData = {
				rollNo: normalizeString(input.rollNo),
				rollNoDate: normalizeString(input.rollNoDate),
			}

			if (existingProfile) {
				await ctx.db
					.update(enpProfiles)
					.set(profileData)
					.where(eq(enpProfiles.userId, ctx.session.user.id))
			} else {
				await ctx.db.insert(enpProfiles).values({
					userId: ctx.session.user.id,
					...profileData,
				})
			}

			return { message: "Roll registration updated successfully" }
		}),

	updateLicensing: protectedProcedure
		.input(licensingSchema)
		.mutation(async ({ ctx, input }) => {
			const existingProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, ctx.session.user.id),
			})

			const normalizeString = (value: string | undefined): string | null => {
				if (value === undefined) return null
				const trimmed = value.trim()
				return trimmed === "" ? null : trimmed
			}

			const profileData = {
				commissionNo: normalizeString(input.commissionNo),
				commissionNoValidUntil: normalizeString(input.commissionNoValidUntil),
				ptrNo: normalizeString(input.ptrNo),
				ptrNoLocation: normalizeString(input.ptrNoLocation),
				ptrNoDate: normalizeString(input.ptrNoDate),
				ibpNo: normalizeString(input.ibpNo),
				ibpNoDate: normalizeString(input.ibpNoDate),
				notaryAddress: normalizeString(input.notaryAddress),
			}

			if (existingProfile) {
				await ctx.db
					.update(enpProfiles)
					.set(profileData)
					.where(eq(enpProfiles.userId, ctx.session.user.id))
			} else {
				await ctx.db.insert(enpProfiles).values({
					userId: ctx.session.user.id,
					...profileData,
				})
			}

			return { message: "Licensing information updated successfully" }
		}),

	updateCertifications: protectedProcedure
		.input(certificationsSchema)
		.mutation(async ({ ctx, input }) => {
			const existingProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, ctx.session.user.id),
			})

			const normalizeString = (value: string | undefined): string | null => {
				if (value === undefined) return null
				const trimmed = value.trim()
				return trimmed === "" ? null : trimmed
			}

			const profileData = {
				mcleNoPeriod: normalizeString(input.mcleNoPeriod),
				mcleNo: normalizeString(input.mcleNo),
				mcleNoDate: normalizeString(input.mcleNoDate),
			}

			if (existingProfile) {
				await ctx.db
					.update(enpProfiles)
					.set(profileData)
					.where(eq(enpProfiles.userId, ctx.session.user.id))
			} else {
				await ctx.db.insert(enpProfiles).values({
					userId: ctx.session.user.id,
					...profileData,
				})
			}

			return { message: "Certifications updated successfully" }
		}),

	updateLawyerPricing: protectedProcedure
		.input(lawyerPricingSchema)
		.mutation(async ({ ctx, input }) => {
			const existingProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, ctx.session.user.id),
			})

			const profileData = {
				consultationPrice: input.consultationPrice ?? null,
				acknowledgmentPrice: input.acknowledgmentPrice ?? null,
				affirmationPrice: input.affirmationPrice ?? null,
				juratPrice: input.juratPrice ?? null,
				signatureWitnessingPrice: input.signatureWitnessingPrice ?? null,
			}

			if (existingProfile) {
				await ctx.db
					.update(enpProfiles)
					.set(profileData)
					.where(eq(enpProfiles.userId, ctx.session.user.id))
			} else {
				await ctx.db.insert(enpProfiles).values({
					userId: ctx.session.user.id,
					...profileData,
				})
			}

			return { message: "Lawyer pricing updated successfully" }
		}),

	getAddress: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
			columns: {
				address: true,
			},
		})

		return {
			address: user?.address ?? "",
		}
	}),

	updateAddress: protectedProcedure.input(addressSchema).mutation(async ({ ctx, input }) => {
		const user = await ctx.db
			.update(users)
			.set({
				address: input.address.trim() !== "" ? input.address.trim() : null,
			})
			.where(eq(users.id, ctx.session.user.id))
			.returning()

		return { message: "Address updated successfully", user }
	}),
})