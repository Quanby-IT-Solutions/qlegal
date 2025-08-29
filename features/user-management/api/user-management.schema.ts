import { z } from "zod"

// Input schemas for validation
export const createUserSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	role: z.enum(["CLIENT", "ADMIN", "SUPER_ADMIN"]),
	organization: z.string().optional()
})

export const updateUserSchema = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	role: z.enum(["CLIENT", "ADMIN", "SUPER_ADMIN"]).optional(),
	organization: z.string().optional()
})

export const userListInputSchema = z.object({
	search: z.string().optional(),
	role: z.enum(["all", "CLIENT", "ADMIN", "SUPER_ADMIN"]).optional(),
	status: z.enum(["all", "active", "pending", "suspended"]).optional(),
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(10)
})

export const getUserByIdSchema = z.object({
	id: z.string()
})

export const deleteUserSchema = z.object({
	id: z.string()
})

export const approveUserSchema = z.object({
	id: z.string()
})

export const suspendUserSchema = z.object({
	id: z.string()
})

export const unsuspendUserSchema = z.object({
	id: z.string()
})

// Type exports for frontend use
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserListInput = z.infer<typeof userListInputSchema>
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>
export type DeleteUserInput = z.infer<typeof deleteUserSchema>
export type ApproveUserInput = z.infer<typeof approveUserSchema>
export type SuspendUserInput = z.infer<typeof suspendUserSchema>
export type UnsuspendUserInput = z.infer<typeof unsuspendUserSchema>
