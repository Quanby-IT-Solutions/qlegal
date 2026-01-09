import { z } from "zod/v4"

// Field type enum - aligned with database FieldType enum
export const fieldTypeEnum = z.enum([
	"SIGNATURE",
	"INITIAL",
	"NAME",
	"DATE",
	"TEXT",
	"EMAIL",
	"CHECKBOX",
	"RADIO",
])

// Field position schema
export const fieldPositionSchema = z.object({
	x: z.number().min(0),
	y: z.number().min(0),
	pageNumber: z.number().min(1),
})

// Field size schema
export const fieldSizeSchema = z.object({
	width: z.number().min(1),
	height: z.number().min(1),
})

// Document field schema
export const documentFieldSchema = z.object({
	id: z.string().optional(), // Optional for new fields
	type: fieldTypeEnum,
	label: z.string().min(1, "Field label is required"),
	placeholder: z.string().optional(),
	required: z.boolean().default(false),
	options: z.array(z.string()).default([]),
	position: fieldPositionSchema,
	size: fieldSizeSchema,
	recipientId: z.string().min(1, "Recipient ID is required"),
})

// Save document fields schema
export const saveDocumentFieldsSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	fields: z.array(documentFieldSchema),
})

// Get document for editing with fields schema
export const getDocumentWithFieldsSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
})

// Get envelope with recipients schema
export const getEnvelopeWithRecipientsSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	documentId: z.string().optional(),
})

// Get document recipients schema
export const getDocumentRecipientsSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
})

// Delete document field schema
export const deleteDocumentFieldSchema = z.object({
	fieldId: z.string().min(1, "Field ID is required"),
})

// Update document field schema
export const updateDocumentFieldSchema = z.object({
	fieldId: z.string().min(1, "Field ID is required"),
	field: documentFieldSchema.omit({ id: true }),
})

// Bulk update document fields schema
export const bulkUpdateDocumentFieldsSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	fields: z.array(
		z.object({
			id: z.string().min(1, "Field ID is required"),
			position: fieldPositionSchema.optional(),
			size: fieldSizeSchema.optional(),
			label: z.string().optional(),
			placeholder: z.string().optional(),
			required: z.boolean().optional(),
			options: z.array(z.string()).optional(),
			recipientId: z.string().optional(),
		})
	),
})

// Get fields by recipient schema
export const getFieldsByRecipientSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	recipientId: z.string().min(1, "Recipient ID is required"),
})

// Validate field placement schema
export const validateFieldPlacementSchema = z.object({
	documentId: z.string().min(1, "Document ID is required"),
	position: fieldPositionSchema,
	size: fieldSizeSchema,
})

export type FieldType = z.infer<typeof fieldTypeEnum>
export type FieldPosition = z.infer<typeof fieldPositionSchema>
export type FieldSize = z.infer<typeof fieldSizeSchema>
export type DocumentField = z.infer<typeof documentFieldSchema>
export type SaveDocumentFieldsInput = z.infer<typeof saveDocumentFieldsSchema>
export type GetDocumentWithFieldsInput = z.infer<typeof getDocumentWithFieldsSchema>
export type GetEnvelopeWithRecipientsInput = z.infer<typeof getEnvelopeWithRecipientsSchema>
export type GetDocumentRecipientsInput = z.infer<typeof getDocumentRecipientsSchema>
export type DeleteDocumentFieldInput = z.infer<typeof deleteDocumentFieldSchema>
export type UpdateDocumentFieldInput = z.infer<typeof updateDocumentFieldSchema>
export type BulkUpdateDocumentFieldsInput = z.infer<typeof bulkUpdateDocumentFieldsSchema>
export type GetFieldsByRecipientInput = z.infer<typeof getFieldsByRecipientSchema>
export type ValidateFieldPlacementInput = z.infer<typeof validateFieldPlacementSchema>
