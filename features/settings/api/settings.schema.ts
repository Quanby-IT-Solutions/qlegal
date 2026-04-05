import { z } from "zod/v4"

// Simple schema for current password (existing passwords may not meet complexity rules)
const currentPasswordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(6, "Password must be at least 6 characters long")

// Complex schema for new password creation
const newPasswordSchema = z
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

const confirmPasswordSchema = z
	.string({ error: "Please confirm your password" })
	.trim()
	.min(12, "Password confirmation must be at least 12 characters")

export const changePasswordSchema = z
	.object({
		currentPassword: currentPasswordSchema,
		newPassword: newPasswordSchema,
		confirmPassword: confirmPasswordSchema,
	})
	.superRefine((data, ctx) => {
		if (data.newPassword !== data.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "New passwords do not match",
				path: ["confirmPassword"],
			})
		}
	})

export const addPasswordSchema = z
	.object({
		newPassword: newPasswordSchema,
		confirmPassword: confirmPasswordSchema,
	})
	.superRefine((data, ctx) => {
		if (data.newPassword !== data.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			})
		}
	})

export const toggleTwoFASchema = z.object({
	enabled: z.boolean(),
})

export const changeRecoveryEmailSchema = z.object({
	newRecoveryEmail: z.email("Please enter a valid email address").trim().toLowerCase(),
})

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>
export type AddPasswordSchema = z.infer<typeof addPasswordSchema>
export type ToggleTwoFASchema = z.infer<typeof toggleTwoFASchema>
export type ChangeRecoveryEmailSchema = z.infer<typeof changeRecoveryEmailSchema>

