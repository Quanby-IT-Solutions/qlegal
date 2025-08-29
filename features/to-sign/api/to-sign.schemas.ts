import { z } from "zod"

// Document signing validation schema
export const signDocumentSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	envelopeId: z.string().min(1, "Envelope ID is required"),
	userId: z.string().min(1, "User ID is required"),
	signatureText: z.string().optional(),
	signatureImage: z.string().optional(), // Base64 encoded image data
	position: z.object({
		x: z.number(),
		y: z.number(),
		pageNumber: z.number().min(1)
	}),
	// Optional size information for resizable signatures
	size: z
		.object({
			width: z.number().positive(),
			height: z.number().positive()
		})
		.optional()
})

export const getEnvelopeToSignSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required")
})

export const listEnvelopesToSignSchema = z.object({
	status: z.enum(["PENDING", "SIGNED", "DECLINED"]).optional(),
	userId: z.string().min(1, "User ID is required"),
	limit: z.number().min(1).max(100).default(10),
	offset: z.number().min(0).default(0)
})

export const findDocumentByIdSchema = z.object({
	id: z.string().min(1, "Document ID is required")
})

// Schema for fetching PDF through proxy to avoid CORS issues
export const getPdfProxySchema = z.object({
	documentId: z.string().min(1, "Document ID is required")
})

// Schema for creating test document record for proxy testing
export const createTestDocumentSchema = z.object({
	name: z.string().min(1, "Document name is required"),
	path: z.string().min(1, "Document path is required"),
	envelopeId: z.string().optional().default("test_envelope_123")
})
