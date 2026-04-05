import { z } from "zod/v4"

export const createSubOrgSchema = z.object({
	name: z.string().min(1, "Name is required"),
	address: z.string().min(1, "Address is required"),
	subOrganizationTypeName: z.string().default("Department"),
})

export const addMemberToSubOrgSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
	email: z.string().email("Valid email is required"),
})

export const listSubOrgMembersSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
})

export const getSubOrgCredentialsSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
})

export const getSubOrgCreditsSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
})

export const transferCreditsToSubOrgSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
	credits: z.coerce.number().int().min(1, "Credits must be at least 1"),
})

export const setSubOrgTokenEmailSchema = z.object({
	subOrgId: z.string().min(1, "Sub-org is required"),
	tokenEmail: z.string().email("Valid email is required"),
})
