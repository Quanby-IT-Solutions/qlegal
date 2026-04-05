import { z } from "zod/v4"

export const submitRecoveryEmailSchema = z.object({
	recoveryEmail: z.email("Please enter a valid email address").trim().toLowerCase(),
})

export const onboardingWizardSchema = z.object({
	recoveryEmail: submitRecoveryEmailSchema.shape.recoveryEmail.or(z.literal("")),
	phoneNumber: z.string().trim(),
})

export const verifyRecoveryEmailSchema = z.object({
	token: z.string().min(1, "Token is required"),
})

export const updateProfileSchema = z.object({
	phoneNumber: z.string().trim().optional().or(z.literal("")),
	firstName: z.string().trim().optional().or(z.literal("")),
	middleName: z.string().trim().optional().or(z.literal("")),
	lastName: z.string().trim().optional().or(z.literal("")),
	homeStreet: z.string().trim().optional().or(z.literal("")),
	barangay: z.string().trim().optional().or(z.literal("")),
	cityProvince: z.string().trim().optional().or(z.literal("")),
})

export const updateAvatarSchema = z.object({
	imagePath: z.string().min(1, "Image path is required"),
})

export type SubmitRecoveryEmailSchema = z.infer<typeof submitRecoveryEmailSchema>
export type OnboardingWizardSchema = z.infer<typeof onboardingWizardSchema>
export type VerifyRecoveryEmailSchema = z.infer<typeof verifyRecoveryEmailSchema>
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>
export type UpdateAvatarSchema = z.infer<typeof updateAvatarSchema>
