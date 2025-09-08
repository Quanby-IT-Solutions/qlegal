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
		email: emailSchema,
		code: z
			.string()
			.length(6, "Code must be 6 digits")
			.regex(/^\d+$/, "Code must contain only numbers"),
		newPassword: passwordSchema,
		confirmPassword: confirmPasswordSchema,
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
export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>
