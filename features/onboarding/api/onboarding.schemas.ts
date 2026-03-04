import { z } from "zod/v4"

export const submitRecoveryEmailSchema = z.object({
	recoveryEmail: z.email("Please enter a valid email address").trim().toLowerCase(),
})

export const verifyRecoveryEmailSchema = z.object({
	token: z.string().min(1, "Token is required"),
})

export type SubmitRecoveryEmailSchema = z.infer<typeof submitRecoveryEmailSchema>
export type VerifyRecoveryEmailSchema = z.infer<typeof verifyRecoveryEmailSchema>
