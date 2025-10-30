import { z } from "zod/v4"

// Search lawyers schema
export const searchLawyersSchema = z.object({
	query: z.string().optional(),
	limit: z.number().min(1).max(100).optional().default(50),
	offset: z.number().min(0).optional().default(0),
})

// Get lawyer by ID schema
export const getLawyerByIdSchema = z.object({
	lawyerId: z.string().min(1, "Lawyer ID is required"),
})

// Type exports
export type SearchLawyersInput = z.infer<typeof searchLawyersSchema>
export type GetLawyerByIdInput = z.infer<typeof getLawyerByIdSchema>
