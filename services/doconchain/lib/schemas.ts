import { z } from "zod/v4"

export const signerSchema = z.object({
	id: z.union([z.number(), z.string()]),
	email: z.string(),
	first_name: z.string().nullish(),
	last_name: z.string().nullish(),
	status: z.string().nullish(),
	signed_at: z.string().nullish(),
	sequence: z.number().nullish(),
	signer_role: z.string().nullish(),
	role: z.string().nullish(),
})

export const projectDataSchema = z.object({
	uuid: z.string().optional(),
	project_uuid: z.string().optional(),
	id: z.union([z.number(), z.string()]).optional(),
	status: z.string().optional(),
	completed_at: z.string().nullish(),
	file_name: z.string().nullish(),
	name: z.string().nullish(),
	signers: z.array(signerSchema).optional(),
	signed_url: z.string().nullish(),
	signed_document_url: z.string().nullish(),
	url: z.string().nullish(),
	certificate_url: z.string().nullish(),
	certificateUrl: z.string().nullish(),
	cert_url: z.string().nullish(),
	redirect_url: z.string().nullish(),
})

export const projectDetailsResponseSchema = z.object({
	data: projectDataSchema.optional(),
	message: z.string().optional(),
})

export const createProjectResponseSchema = z.object({
	data: z.object({
		uuid: z.string(),
		id: z.union([z.number(), z.string()]).optional(),
		redirect_url: z.string().optional(),
	}),
	message: z.string().optional(),
})

export const vaultItemSchema = z.object({
	id: z.number(),
	uuid: z.string(),
	client_id: z.number(),
	category_id: z.number().nullish(),
	project_uuid: z.string(),
	category_type: z.string(),
	signatory_type: z.string(),
	name: z.string(),
	size: z.string(),
	status: z.string(),
	created_at: z.string(),
	actions: z.array(z.string()),
	contents: z.array(z.unknown()),
})

export const vaultItemsResponseSchema = z.object({
	message: z.string(),
	data: z.array(vaultItemSchema),
	meta: z.object({
		total: z.number(),
		per_page: z.number(),
		first_page: z.number(),
		last_page: z.number(),
		current_page: z.number(),
	}),
})

export const vaultFileSchema = z.object({
	file_url: z.string().optional(),
	url: z.string().optional(),
	file_name: z.string().optional(),
	name: z.string().optional(),
	type: z.string().optional(),
	tab: z.string().optional(),
})

export const vaultItemDetailSchema = z.object({
	message: z.string().optional(),
	data: z
		.object({
			files: z.array(vaultFileSchema).optional(),
			file_name: z.string().optional(),
			name: z.string().optional(),
		})
		.passthrough()
		.optional(),
})

export const verifyTokenResponseSchema = z.object({
	message: z.string(),
	data: z.object({
		redirect_to: z.string(),
		status: z.string(),
	}),
})

export type Signer = z.infer<typeof signerSchema>
export type ProjectData = z.infer<typeof projectDataSchema>
export type ProjectDetailsResponse = z.infer<typeof projectDetailsResponseSchema>
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>
export type VaultItem = z.infer<typeof vaultItemSchema>
export type VaultItemsResponse = z.infer<typeof vaultItemsResponseSchema>
export type VaultFile = z.infer<typeof vaultFileSchema>
export type VaultItemDetail = z.infer<typeof vaultItemDetailSchema>
export type VerifyTokenResponse = z.infer<typeof verifyTokenResponseSchema>