import { z } from "zod"

// Document upload schema
export const uploadDocumentSchema = z.object({
	name: z.string().min(1, "Document name is required"),
	file: z.any().refine((file) => file instanceof File, "File is required"),
	description: z.string().optional()
})

// Recipient schema
export const recipientSchema = z.object({
	id: z.string().optional(), // For existing recipients
	email: z.string().email("Valid email is required"),
	name: z.string().min(1, "Name is required"),
	role: z.enum(["SIGNER", "APPROVER", "CC"]).default("SIGNER"),
	order: z.number().min(1).default(1)
})

// Field types for document fields
export const fieldTypeSchema = z.enum([
	"SIGNATURE",
	"INITIAL",
	"NAME",
	"DATE",
	"TEXT",
	"EMAIL",
	"CHECKBOX",
	"RADIO"
])

// Document field schema for positioning
export const documentFieldSchema = z.object({
	id: z.string().optional(), // For existing fields
	type: fieldTypeSchema,
	label: z.string().min(1, "Field label is required"),
	position: z.object({
		x: z.number().min(0).max(1), // Relative position (0-1)
		y: z.number().min(0).max(1), // Relative position (0-1)
		pageNumber: z.number().min(1)
	}),
	size: z.object({
		width: z.number().positive(),
		height: z.number().positive()
	}),
	required: z.boolean().default(true),
	recipientId: z.string().min(1, "Recipient assignment is required"),
	placeholder: z.string().optional(),
	options: z.array(z.string()).optional() // For radio/checkbox fields
})

// Create envelope schema with the new flow
export const createEnvelopeSchema = z.object({
	title: z.string().min(1, "Envelope title is required"),
	description: z.string().optional(),
	documentId: z.string().min(1, "Document ID is required"),
	recipients: z
		.array(recipientSchema)
		.min(1, "At least one recipient is required"),
	fields: z.array(documentFieldSchema).min(1, "At least one field is required"),
	settings: z
		.object({
			requireOrder: z.boolean().default(false), // Sequential signing
			expirationDays: z.number().min(1).max(365).default(30),
			reminderDays: z.number().min(1).max(30).default(3),
			allowDecline: z.boolean().default(true)
		})
		.optional()
})

// Update envelope schema for editing
export const updateEnvelopeSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	title: z.string().optional(),
	description: z.string().optional(),
	recipients: z.array(recipientSchema).optional(),
	fields: z.array(documentFieldSchema).optional(),
	settings: z
		.object({
			requireOrder: z.boolean().optional(),
			expirationDays: z.number().min(1).max(365).optional(),
			reminderDays: z.number().min(1).max(30).optional(),
			allowDecline: z.boolean().optional()
		})
		.optional()
})

// Field positioning schema for live updates
export const updateFieldPositionSchema = z.object({
	fieldId: z.string().min(1, "Field ID is required"),
	position: z.object({
		x: z.number().min(0).max(1),
		y: z.number().min(0).max(1),
		pageNumber: z.number().min(1)
	}),
	size: z
		.object({
			width: z.number().positive(),
			height: z.number().positive()
		})
		.optional()
})

// Send envelope schema
export const sendEnvelopeSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	message: z.string().optional(),
	sendNow: z.boolean().default(true)
})

// Preview envelope schema
export const previewEnvelopeSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	recipientId: z.string().min(1, "Recipient ID is required")
})

// Get document for editing schema
export const getDocumentForEditingSchema = z.object({
	documentId: z.string().min(1, "Document ID is required")
})

// List envelopes schema
export const listEnvelopesSchema = z.object({
	status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
	limit: z.number().min(1).max(100).default(10),
	offset: z.number().min(0).default(0),
	search: z.string().optional()
})
