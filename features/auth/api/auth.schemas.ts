import { z } from "zod/v4"

// Base validation schemas - Single responsibility principle
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

const passwordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(6, "Password must be at least 6 characters long")

const confirmPasswordSchema = z
	.string({ error: "Please confirm your password" })
	.trim()
	.min(6, "Password confirmation must be at least 6 characters long")

const agreeToTermsSchema = z.boolean({
	error: "You must agree to the terms and conditions",
})

export const registerSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: confirmPasswordSchema,
		agreeToTerms: agreeToTermsSchema,
	})
	.superRefine((data, ctx) => {
		// Password confirmation validation
		if (data.password !== data.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			})
		}

		if (data.agreeToTerms !== true) {
			ctx.addIssue({
				code: "custom",
				message: "You must agree to the terms and conditions",
				path: ["agreeToTerms"],
			})
		}
	})

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	code: z.string().optional(),
})

export const twoFactorLoginSchema = z.object({
	email: emailSchema,
	code: z
		.string()
		.length(6, "Code must be 6 digits")
		.regex(/^\d+$/, "Code must contain only numbers"),
})

export const forgotPasswordSchema = z.object({
	email: emailSchema,
})

export const resetPasswordSchema = z
	.object({
		newPassword: passwordSchema,
		confirmPassword: confirmPasswordSchema,
		token: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		// Password confirmation validation
		if (data.newPassword !== data.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			})
		}
	})

export const verifyEmailSchema = z.object({
	token: z.string().min(1, "Token is required"),
})

export type RegisterSchema = z.infer<typeof registerSchema>
export type LoginSchema = z.infer<typeof loginSchema>
export type TwoFactorLoginSchema = z.infer<typeof twoFactorLoginSchema>
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>

// --- Lawyer Registration Schemas ---

// Notary seal information
const notarySealSchema = z.object({
	enpName: z.string().min(1, "ENP name is required"),
	enpRoleNumber: z.string().min(1, "ENP role number is required"),
})

// Notary professional information
const notaryInfoSchema = z.object({
	attyName: z.string().min(1, "Attorney name is required"),
	rollNo: z.string().min(1, "Roll of Attorneys number is required"),
	rollNoDate: z.string().min(1, "Roll number date is required"),
	commissionNo: z.string().min(1, "Commission number is required"),
	commissionNoValidUntil: z.string().min(1, "Commission validity date is required"),
	ptrNo: z.string().min(1, "PTR number is required"),
	ptrNoLocation: z.string().min(1, "PTR location is required"),
	ptrNoDate: z.string().min(1, "PTR date is required"),
	ibpNo: z.string().min(1, "IBP number is required"),
	ibpNoDate: z.string().min(1, "IBP date is required"),
	notaryEmail: z.email("Please enter a valid email").min(1, "Notary email is required"),
	notaryAddress: z.string().min(10, "Please enter a complete address"),
	mcleNoPeriod: z.string().min(1, "MCLE period is required"),
	mcleNo: z.string().min(1, "MCLE number is required"),
	mcleNoDate: z.string().min(1, "MCLE date is required"),
	modeOfNotarization: z.string().min(1, "Mode of notarization is required"),
})

// Complete lawyer registration schema
export const lawyerRegisterSchema = z
	.object({
		// Basic account info
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: confirmPasswordSchema,
		agreeToTerms: agreeToTermsSchema,

		// Notary seal info
		seal: notarySealSchema,

		// Notary professional info
		notaryInfo: notaryInfoSchema,
	})
	.superRefine((data, ctx) => {
		if (data.password !== data.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			})
		}

		if (data.agreeToTerms !== true) {
			ctx.addIssue({
				code: "custom",
				message: "You must agree to the terms and conditions",
				path: ["agreeToTerms"],
			})
		}
	})

export type NotarySealSchema = z.infer<typeof notarySealSchema>
export type NotaryInfoSchema = z.infer<typeof notaryInfoSchema>
export type LawyerRegisterSchema = z.infer<typeof lawyerRegisterSchema>
export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>
