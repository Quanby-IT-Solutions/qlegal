import { z } from "zod/v4"

export const listMySignedEnvelopesSchema = z.object({
	status: z.enum(["ALL", "SIGNED", "COMPLETED"]).optional().default("ALL"),
	limit: z.number().min(1).max(100).optional().default(10),
	offset: z.number().min(0).optional().default(0),
	userId: z.string(),
})

export const getMySignedEnvelopeSchema = z.object({
	envelopeId: z.string(),
	userId: z.string(),
})

export const downloadSignedDocumentSchema = z.object({
	documentId: z.string(),
	userId: z.string(),
})

export const getSigningTimelineSchema = z.object({
	userId: z.string(),
	period: z.enum(["week", "month", "year"]).optional().default("month"),
})

export type ListMySignedEnvelopesInput = z.infer<typeof listMySignedEnvelopesSchema>
export type GetMySignedEnvelopeInput = z.infer<typeof getMySignedEnvelopeSchema>
export type DownloadSignedDocumentInput = z.infer<typeof downloadSignedDocumentSchema>
export type GetSigningTimelineInput = z.infer<typeof getSigningTimelineSchema>
