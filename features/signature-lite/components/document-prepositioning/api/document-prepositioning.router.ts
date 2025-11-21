import { TRPCError } from "@trpc/server"

import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	bulkUpdateDocumentFieldsSchema,
	deleteDocumentFieldSchema,
	getDocumentRecipientsSchema,
	getDocumentWithFieldsSchema,
	getEnvelopeWithRecipientsSchema,
	getFieldsByRecipientSchema,
	saveDocumentFieldsSchema,
	updateDocumentFieldSchema,
	validateFieldPlacementSchema,
} from "./document-prepositioning.schemas"

export const documentPrepositioningRouter = createTRPCRouter({
	// Get document with fields and related data
	getDocumentWithFields: protectedProcedure
		.input(getDocumentWithFieldsSchema)
		.query(async ({ ctx, input }) => {
			const document = await ctx.db.document.findUnique({
				where: { id: input.documentId },
				include: {
					documentFields: {
						orderBy: { createdAt: "asc" },
					},
					envelope: {
						include: {
							recipient: {
								include: {
									user: {
										select: {
											id: true,
											name: true,
											email: true,
										},
									},
								},
							},
						},
					},
				},
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// Only envelope creator (owner) can access positioning functionality
			if (!document.envelope || document.envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the envelope creator can access positioning functionality",
				})
			}

			// Get document public URL using the proper helper
			// Check if document has a valid path
			if (!document.path || document.path.trim() === "") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document file is not available. The document may not have been uploaded to storage yet.",
				})
			}

			let documentUrl: string
			try {
				documentUrl = await getDocumentPublicUrl(document.path)
			} catch (error) {
				console.error("Error generating document URL:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error 
						? `Failed to generate document URL: ${error.message}` 
						: "Failed to generate document URL. The document file may not be available in storage.",
				})
			}

			return {
				...document,
				url: documentUrl,
			}
		}),

	// Get envelope with recipients
	getEnvelopeWithRecipients: protectedProcedure
		.input(getEnvelopeWithRecipientsSchema)
		.query(async ({ ctx, input }) => {
			const envelope = await ctx.db.envelope.findUnique({
				where: { id: input.envelopeId },
				include: {
					recipient: {
						where: {
							documentId: input.documentId ?? undefined,
						},
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
				},
			})

			if (!envelope) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Envelope not found",
				})
			}

			// Only envelope creator (owner) can access positioning functionality
			const isOwner = envelope.userId === ctx.session.user.id

			if (!isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the envelope creator can access positioning functionality",
				})
			}

			return envelope
		}),

	// Get document-specific recipients (excluding VIEWERs)
	getDocumentRecipients: protectedProcedure
		.input(getDocumentRecipientsSchema)
		.query(async ({ ctx, input }) => {
			const document = await ctx.db.document.findUnique({
				where: { id: input.documentId },
				include: {
					envelope: true,
					recipients: {
						where: {
							role: {
								not: "VIEWER", // Exclude VIEWER role recipients
							},
						},
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
				},
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// Check if user has access to this document
			const isOwner = document.envelope?.userId === ctx.session.user.id
			const isRecipient = document.recipients.some(r => r.user?.email === ctx.session.user.email)

			if (!isOwner && !isRecipient) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to access this document",
				})
			}

			return document.recipients
		}),

	// Save/update document fields
	saveDocumentFields: protectedProcedure
		.input(saveDocumentFieldsSchema)
		.mutation(async ({ ctx, input }) => {
			const { documentId, fields } = input

			// Verify document exists and user has access
			const document = await ctx.db.document.findUnique({
				where: { id: documentId },
				include: {
					envelope: true,
				},
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			if (!document.envelope || document.envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to edit this document",
				})
			}

			try {
				// Delete existing fields for this document
				await ctx.db.documentField.deleteMany({
					where: { documentId },
				})

				// Create new fields
				const createdFields = await Promise.all(
					fields.map(field =>
						ctx.db.documentField.create({
							data: {
								documentId,
								type: field.type,
								label: field.label,
								placeholder: field.placeholder,
								required: field.required,
								options: field.options,
								x: field.position.x,
								y: field.position.y,
								pageNumber: field.position.pageNumber,
								width: field.size.width,
								height: field.size.height,
								recipientId: field.recipientId,
							},
						})
					)
				)

				return {
					success: true,
					fieldsCreated: createdFields.length,
				}
			} catch (error) {
				console.error("Save document fields error:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to save document fields",
				})
			}
		}),

	// Delete a specific document field
	deleteDocumentField: protectedProcedure
		.input(deleteDocumentFieldSchema)
		.mutation(async ({ ctx, input }) => {
			const field = await ctx.db.documentField.findUnique({
				where: { id: input.fieldId },
				include: {
					document: {
						include: {
							envelope: true,
						},
					},
				},
			})

			if (!field) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Field not found",
				})
			}

			if (!field.document.envelope || field.document.envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to delete this field",
				})
			}

			await ctx.db.documentField.delete({
				where: { id: input.fieldId },
			})

			return { success: true }
		}),

	// Update a specific document field
	updateDocumentField: protectedProcedure
		.input(updateDocumentFieldSchema)
		.mutation(async ({ ctx, input }) => {
			const { fieldId, field } = input

			const existingField = await ctx.db.documentField.findUnique({
				where: { id: fieldId },
				include: {
					document: {
						include: {
							envelope: true,
						},
					},
				},
			})

			if (!existingField) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Field not found",
				})
			}

			if (
				!existingField.document.envelope ||
				existingField.document.envelope.userId !== ctx.session.user.id
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this field",
				})
			}

			const updatedField = await ctx.db.documentField.update({
				where: { id: fieldId },
				data: {
					type: field.type,
					label: field.label,
					placeholder: field.placeholder,
					required: field.required,
					options: field.options,
					x: field.position.x,
					y: field.position.y,
					pageNumber: field.position.pageNumber,
					width: field.size.width,
					height: field.size.height,
					recipientId: field.recipientId,
				},
			})

			return updatedField
		}),

	// Bulk update multiple document fields
	bulkUpdateDocumentFields: protectedProcedure
		.input(bulkUpdateDocumentFieldsSchema)
		.mutation(async ({ ctx, input }) => {
			const { documentId, fields } = input

			// Verify document exists and user has access
			const document = await ctx.db.document.findUnique({
				where: { id: documentId },
				include: {
					envelope: true,
				},
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			if (!document.envelope || document.envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to edit this document",
				})
			}

			try {
				const updatedFields = await Promise.all(
					fields.map(field => {
						const updateData: Record<string, unknown> = {}

						if (field.position) {
							updateData.x = field.position.x
							updateData.y = field.position.y
							updateData.pageNumber = field.position.pageNumber
						}

						if (field.size) {
							updateData.width = field.size.width
							updateData.height = field.size.height
						}

						if (field.label !== undefined) updateData.label = field.label
						if (field.placeholder !== undefined) updateData.placeholder = field.placeholder
						if (field.required !== undefined) updateData.required = field.required
						if (field.options !== undefined) updateData.options = field.options
						if (field.recipientId !== undefined) updateData.recipientId = field.recipientId

						return ctx.db.documentField.update({
							where: { id: field.id },
							data: updateData,
						})
					})
				)

				return {
					success: true,
					fieldsUpdated: updatedFields.length,
				}
			} catch (error) {
				console.error("Bulk update fields error:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update document fields",
				})
			}
		}),

	// Get fields for a specific recipient
	getFieldsByRecipient: protectedProcedure
		.input(getFieldsByRecipientSchema)
		.query(async ({ ctx, input }) => {
			const fields = await ctx.db.documentField.findMany({
				where: {
					documentId: input.documentId,
					recipientId: input.recipientId,
				},
				orderBy: { createdAt: "asc" },
			})

			return fields
		}),

	// Validate field placement (check for overlaps, boundaries, etc.)
	validateFieldPlacement: protectedProcedure
		.input(validateFieldPlacementSchema)
		.query(async ({ ctx, input }) => {
			const { documentId, position, size } = input

			// Check for overlapping fields
			const overlappingFields = await ctx.db.documentField.findMany({
				where: {
					documentId,
					pageNumber: position.pageNumber,
					AND: [
						{
							x: {
								lt: position.x + size.width,
							},
						},
						{
							x: {
								gte: position.x - size.width,
							},
						},
						{
							y: {
								lt: position.y + size.height,
							},
						},
						{
							y: {
								gte: position.y - size.height,
							},
						},
					],
				},
			})

			return {
				isValid: overlappingFields.length === 0,
				overlappingFields: overlappingFields.length,
				warnings: overlappingFields.length > 0 ? ["Field overlaps with existing fields"] : [],
			}
		}),
})
