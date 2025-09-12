import { z } from "zod/v4"

const currentPasswordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(6, "Password must be at least 6 characters long")

const newPasswordSchema = z
	.string({ error: "Password is required" })
	.trim()
	.min(6, "Password must be at least 6 characters long")

const confirmPasswordSchema = z
	.string({ error: "Please confirm your password" })
	.trim()
	.min(6, "Password confirmation must be at least 6 characters long")

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

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>
