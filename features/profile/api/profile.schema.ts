import { z } from "zod/v4"

const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/)

const nameSchema = z
	.string({ error: "Name is required" })
	.trim()
	.min(1, "Name cannot be empty")
	.trim()

const emailSchema = z
	.email("Please enter a valid email address")
	.min(1, "Email is required")
	.trim()
	.toLowerCase()

const phoneNumberSchema = z
	.string()
	.trim()
	.optional()
	.or(z.literal(""))
	.refine(val => !val || phoneRegex.test(val), "Invalid phone number!")

export const personalInformationSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	phoneNumber: phoneNumberSchema,
})

export type PersonalInformationSchema = z.infer<typeof personalInformationSchema>

export const addressSchema = z.object({
	address: z.string().trim().min(1, "Address is required"),
})

export type AddressSchema = z.infer<typeof addressSchema>

export const enpProfileSchema = z.object({
	// Notary Seal Info
	rollNo: z.string().optional(),
	rollNoDate: z.string().optional(),

	// Credentials
	commissionNo: z.string().optional(),
	commissionNoValidUntil: z.string().optional(),
	ptrNo: z.string().optional(),
	ptrNoLocation: z.string().optional(),
	ptrNoDate: z.string().optional(),
	ibpNo: z.string().optional(),
	ibpNoDate: z.string().optional(),
	notaryAddress: z.string().optional(),
	mcleNoPeriod: z.string().optional(),
	mcleNo: z.string().optional(),
	mcleNoDate: z.string().optional(),
})

export type EnpProfileSchema = z.infer<typeof enpProfileSchema>

// Partial update schemas for individual ENP profile sections
export const rollRegistrationSchema = z.object({
	rollNo: z.string().optional(),
	rollNoDate: z.string().optional(),
})

export type RollRegistrationSchema = z.infer<typeof rollRegistrationSchema>

export const licensingSchema = z.object({
	commissionNo: z.string().optional(),
	commissionNoValidUntil: z.string().optional(),
	ptrNo: z.string().optional(),
	ptrNoLocation: z.string().optional(),
	ptrNoDate: z.string().optional(),
	ibpNo: z.string().optional(),
	ibpNoDate: z.string().optional(),
	notaryAddress: z.string().optional(),
})

export type LicensingSchema = z.infer<typeof licensingSchema>

export const certificationsSchema = z.object({
	mcleNoPeriod: z.string().optional(),
	mcleNo: z.string().optional(),
	mcleNoDate: z.string().optional(),
})

export type CertificationsSchema = z.infer<typeof certificationsSchema>

// Lawyer pricing schema for consultation and eNotarization services
export const lawyerPricingSchema = z.object({
	consultationPrice: z.number().positive("Consultation price must be positive").optional(),
	acknowledgmentPrice: z.number().positive("Acknowledgment price must be positive").optional(),
	affirmationPrice: z.number().positive("Affirmation price must be positive").optional(),
	juratPrice: z.number().positive("Jurat price must be positive").optional(),
	signatureWitnessingPrice: z.number().positive("Signature witnessing price must be positive").optional(),
})

export type LawyerPricingSchema = z.infer<typeof lawyerPricingSchema>