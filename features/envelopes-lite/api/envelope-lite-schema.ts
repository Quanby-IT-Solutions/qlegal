import { z } from "zod/v4"

export const createEnvelopeSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional()
})
export const downloadDocumentSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	envelopeId: z.string().min(1, "Envelope ID is required")
})
export type CreateEnvelopeSchema = z.infer<typeof createEnvelopeSchema>
