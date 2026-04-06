import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { formatDateForStamp } from "@/core/lib/format-date-for-stamp"
import { getFullName } from "@/core/lib/utils"
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
	updateProfessionalDetailsSchema,
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
			columns: { firstName: true, middleName: true, lastName: true },
		})

		return {
			organization: getFullName(user) ?? "",
		}
	}),

	getPersonalInformation: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
			columns: {
				firstName: true,
				middleName: true,
				lastName: true,
				email: true,
				phoneNumber: true,
			},
		})

		return {
			name: getFullName(user) ?? "",
			email: user?.email ?? "",
			phoneNumber: user?.phoneNumber ?? "",
		}
	}),

	updatePersonalInformation: protectedProcedure
		.input(personalInformationSchema)
		.mutation(async ({ ctx, input }) => {
			// Split single name field into first, middle, last for storage
			const parts = (input.name ?? "").trim().split(/\s+/)
			const firstName = parts[0] ?? ""
			const lastName = parts.length > 1 ? (parts[parts.length - 1] ?? "") : ""
			const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""

			const [user] = await ctx.db
				.update(users)
				.set({
					firstName: firstName || null,
					middleName: middleName || null,
					lastName: lastName || null,
					email: input.email,
					phoneNumber:
						input.phoneNumber && input.phoneNumber.trim() !== "" ? input.phoneNumber : null,
				})
				.where(eq(users.id, ctx.session.user.id))
				.returning()

			return { message: "Personal information updated successfully", user }
		}),

	getEnpProfile: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, ctx.session.user.id),
			with: {
				user: {
					columns: { firstName: true, middleName: true, lastName: true },
				},
			},
		})

		if (!result) {
			return null
		}

		const { user, ...enpProfile } = result
		const displayName = getFullName(user) ?? ""

		return {
			// Display name from user (canonical source)
			enpName: displayName,
			rollNo: enpProfile.rollNo ?? "",
			rollNoDate: enpProfile.rollNoDate ?? "",

			// Credentials (atty name from user - canonical source)
			attyName: displayName,
			commissionNo: enpProfile.commissionNo ?? "",
			commissionNoValidUntil: enpProfile.commissionNoValidUntil ?? "",
			ptrNo: enpProfile.ptrNo ?? "",
			ptrNoLocation: enpProfile.ptrNoLocation ?? "",
			ptrNoDate: enpProfile.ptrNoDate ?? "",
			ibpNo: enpProfile.ibpNo ?? "",
			ibpNoDate: enpProfile.ibpNoDate ?? "",
			notaryAddress: enpProfile.notaryAddress ?? "",
			mcleNoPeriod: enpProfile.mcleNoPeriod ?? "",
			mcleNo: enpProfile.mcleNo ?? "",
			mcleNoDate: enpProfile.mcleNoDate ?? "",

			// Supreme Court eNotarization API Fields
			notaryPublicNumber: enpProfile.notaryPublicNumber ?? "",
			notaryFacilityNumber: enpProfile.notaryFacilityNumber ?? "",

			// Pricing
			consultationPrice: enpProfile.consultationPrice ?? null,
			acknowledgmentPrice: enpProfile.acknowledgmentPrice ?? null,
			affirmationPrice: enpProfile.affirmationPrice ?? null,
			juratPrice: enpProfile.juratPrice ?? null,
			signatureWitnessingPrice: enpProfile.signatureWitnessingPrice ?? null,

			// ADD THESE FIELDS:
			bio: enpProfile.bio ?? "",
			experience: enpProfile.experience ?? "",
			responseTime: enpProfile.responseTime ?? "",
			rating: enpProfile.rating ?? 0,
			reviewCount: enpProfile.reviewCount ?? 0,
		}
	}),

	updateProfessionalDetails: protectedProcedure
		.input(updateProfessionalDetailsSchema)
		.mutation(async ({ ctx, input }) => {
			const existingProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, ctx.session.user.id),
			})

			const profileData = {
				bio: input.bio,
				experience: input.experience,
				responseTime: input.responseTime,
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

			return { message: "Professional details updated successfully" }
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

		// Store dates in human-readable form so document seals never receive raw ISO
		const profileData = {
			rollNo: normalizeString(input.rollNo),
			rollNoDate: normalizeString(input.rollNoDate),
			commissionNo: normalizeString(input.commissionNo),
			commissionNoValidUntil:
				(input.commissionNoValidUntil &&
					formatDateForStamp(input.commissionNoValidUntil)) ??
				normalizeString(input.commissionNoValidUntil),
			ptrNo: normalizeString(input.ptrNo),
			ptrNoLocation: normalizeString(input.ptrNoLocation),
			ptrNoDate:
				(input.ptrNoDate && formatDateForStamp(input.ptrNoDate)) ??
				normalizeString(input.ptrNoDate),
			ibpNo: normalizeString(input.ibpNo),
			ibpNoDate: normalizeString(input.ibpNoDate),
			notaryAddress: normalizeString(input.notaryAddress),
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
				rollNoDate:
					(input.rollNoDate && formatDateForStamp(input.rollNoDate)) ??
					normalizeString(input.rollNoDate),
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

	updateLicensing: protectedProcedure.input(licensingSchema).mutation(async ({ ctx, input }) => {
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
			commissionNoValidUntil:
				(input.commissionNoValidUntil &&
					formatDateForStamp(input.commissionNoValidUntil)) ??
				normalizeString(input.commissionNoValidUntil),
			ptrNo: normalizeString(input.ptrNo),
			ptrNoLocation: normalizeString(input.ptrNoLocation),
			ptrNoDate:
				(input.ptrNoDate && formatDateForStamp(input.ptrNoDate)) ??
				normalizeString(input.ptrNoDate),
			ibpNo: normalizeString(input.ibpNo),
			ibpNoDate:
				(input.ibpNoDate && formatDateForStamp(input.ibpNoDate)) ??
				normalizeString(input.ibpNoDate),
			notaryAddress: normalizeString(input.notaryAddress),
			// Supreme Court eNotarization API Fields (NFN is from SUPREME_COURT_NFN env)
			notaryPublicNumber: normalizeString(input.notaryPublicNumber),
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

			// Store MCLE date in human-readable form so document seals never receive raw ISO
			const mcleNoDateStored =
				(input.mcleNoDate && formatDateForStamp(input.mcleNoDate)) ??
				normalizeString(input.mcleNoDate)

			// Guard: MCLE Period should be a period label (e.g. "VIII"), not an ISO timestamp.
			// If an ISO string is accidentally sent (e.g., from an older UI), drop it to prevent ugly seals.
			const mcleNoPeriodStoredRaw = normalizeString(input.mcleNoPeriod)
			const mcleNoPeriodStored =
				typeof mcleNoPeriodStoredRaw === "string" &&
				/^\d{4}-\d{2}-\d{2}T/.test(mcleNoPeriodStoredRaw.trim())
					? null
					: mcleNoPeriodStoredRaw
			const profileData = {
				mcleNoPeriod: mcleNoPeriodStored,
				mcleNo: normalizeString(input.mcleNo),
				mcleNoDate: mcleNoDateStored,
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
