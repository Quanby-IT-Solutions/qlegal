import { z } from "zod/v4"

// Base validation schemas - Single responsibility principle
const firstNameSchema = z
	.string({ error: "First name is required" })
	.trim()
	.min(1, "First name cannot be empty")
const middleNameSchema = z.string().trim().optional()
const lastNameSchema = z
	.string({ error: "Last name is required" })
	.trim()
	.min(1, "Last name cannot be empty")

const emailSchema = z
	.email("Please enter a valid email address")
	.min(1, "Email is required")
	.trim()
	.toLowerCase()

// Simple password schema for login (existing passwords may not meet complexity rules)
const passwordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(6, "Password must be at least 6 characters long")

// Complex password schema for new password creation (registration, reset, etc.)
const complexPasswordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(12, "Password must be at least 12 characters")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter")
	.regex(/\d/, "Password must contain at least one number")
	.regex(
		/[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/,
		"Password must contain at least one special character"
	)

const complexConfirmPasswordSchema = z
	.string({ error: "Please confirm your password" })
	.trim()
	.min(12, "Password confirmation must be at least 12 characters")

const agreeToTermsSchema = z.boolean({
	error: "You must agree to the terms and conditions",
})

/**
 * Optional text fields: missing keys / null / undefined from the client are coerced to "",
 * then empty string becomes undefined for storage (tRPC input must accept omitted fields).
 */
const optionalTrimmed = (max: number, label: string) =>
	z.preprocess(
		(val: unknown) => (val === undefined || val === null ? "" : typeof val === "string" ? val : ""),
		z
			.string()
			.trim()
			.max(max, `${label} must be at most ${max} characters`)
			.transform(s => (s === "" ? undefined : s))
	)

export const registerSchema = z
	.object({
		firstName: firstNameSchema,
		middleName: optionalTrimmed(255, "Middle name"),
		lastName: lastNameSchema,
		prefix: optionalTrimmed(50, "Prefix"),
		suffix: optionalTrimmed(50, "Suffix"),
		email: emailSchema,
		password: complexPasswordSchema,
		confirmPassword: complexConfirmPasswordSchema,
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
		newPassword: complexPasswordSchema,
		confirmPassword: complexConfirmPasswordSchema,
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

function isoOrYmdToYmd(value: string): string {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return ""
	return d.toISOString().slice(0, 10)
}

// Notary seal information
const notarySealSchema = z.object({
	enpName: z.string().min(1, "ENP name is required"),
	enpRollNumber: z
		.string()
		.trim()
		.regex(/^\d{5}$/, "ENP roll number must be exactly 5 digits"),
	rollNoDate: z
		.string()
		.min(1, "Roll number date is required")
		.refine(
			value => {
				const ymd = isoOrYmdToYmd(value)
				if (!ymd) return false

				const inputUtcMidnight = new Date(`${ymd}T00:00:00.000Z`)
				const todayYmd = new Date().toISOString().slice(0, 10)
				const todayUtcMidnight = new Date(`${todayYmd}T00:00:00.000Z`)

				return inputUtcMidnight.getTime() <= todayUtcMidnight.getTime()
			},
			{ message: "Roll number date cannot be greater than today" }
		),
})

// Notary professional information
const notaryInfoSchema = z.object({
	attyName: z.string().min(1, "Attorney name is required"),
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
		firstName: firstNameSchema,
		middleName: middleNameSchema,
		lastName: lastNameSchema,
		email: emailSchema,
		password: complexPasswordSchema,
		confirmPassword: complexConfirmPasswordSchema,
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
