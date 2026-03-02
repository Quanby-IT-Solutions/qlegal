import { z } from "zod/v4"

// Input schemas for validation
export const createUserSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	role: z.enum(["ENP", "PRINCIPAL", "ENA", "ADMIN"]),
})

export const updateUserSchema = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	role: z.enum(["ENP", "PRINCIPAL", "ENA", "ADMIN"]).optional(),
})

export const userListInputSchema = z.object({
	search: z.string().optional(),
	role: z.enum(["all", "ENP", "PRINCIPAL", "ENA", "ADMIN"]).optional(),
	status: z.enum(["all", "ACTIVE", "PENDING", "SUSPENDED"]).optional(),
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(10),
})

export const getUserByIdSchema = z.object({
	id: z.string(),
})

export const deleteUserSchema = z.object({
	id: z.string(),
})

export const approveUserSchema = z.object({
	id: z.string(),
})

export const suspendUserSchema = z.object({
	id: z.string(),
})

export const unsuspendUserSchema = z.object({
	id: z.string(),
})

export const provisionEnpDoconchainSubOrgSchema = z.object({
	enpId: z.string().min(1),
	name: z.string().min(1).optional(),
	address: z.string().min(1).optional(),
	subOrganizationTypeName: z.string().min(1).optional(),
})

export const transferEnpDoconchainCreditsSchema = z.object({
	enpId: z.string().min(1),
	credits: z.coerce.number().int().positive(),
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
export type ProvisionEnpDoconchainSubOrgInput = z.infer<typeof provisionEnpDoconchainSubOrgSchema>
export type TransferEnpDoconchainCreditsInput = z.infer<typeof transferEnpDoconchainCreditsSchema>
