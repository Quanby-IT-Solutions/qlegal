import { TRPCError } from "@trpc/server"
import { PDFDocument, rgb } from "pdf-lib"
import { z } from "zod"

import { getSupabaseClient } from "@/services/supabase"
import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { documentPrepositioningRouter } from "../components/document-prepositioning/api/document-prepositioning.router"
import {
	createEnvelopeSchema,
	getDocumentForEditingSchema,
	sendEnvelopeSchema
} from "./new-signature.schemas"

// Signature schemas (consolidated)
const getDocumentForSigningSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	documentId: z.string().min(1, "Document ID is required")
})

const signFieldSchema = z.object({
	fieldId: z.string().min(1, "Field ID is required"),
	signatureData: z.object({
		type: z.enum(["drawn", "typed", "uploaded", "default"]),
		value: z.string().min(1, "Signature value is required"),
		ipAddress: z.string().optional(),
		userAgent: z.string().optional()
	})
})

const completeDocumentSignatureSchema = z.object({
	envelopeId: z.string().min(1, "Envelope ID is required"),
	documentId: z.string().min(1, "Document ID is required"),
	agreed: z.boolean().refine((val) => val === true, "Must agree to terms")
})

// Helper function to validate and clean base64 image data
function validateAndCleanBase64Image(dataUrl: string): {
	isValid: boolean
	mimeType: string
	base64Data: string
	error?: string
} {
	try {
		// Check if it starts with data:image
		if (!dataUrl.startsWith("data:image")) {
			return {
				isValid: false,
				mimeType: "",
				base64Data: "",
				error: "Not a data URL"
			}
		}

		// Split the data URL
		const parts = dataUrl.split(",")
		if (parts.length !== 2) {
			return {
				isValid: false,
				mimeType: "",
				base64Data: "",
				error: "Invalid data URL format"
			}
		}

		const header = parts[0] ?? ""
		const base64Data = parts[1] ?? ""

		// Extract MIME type using exec
		const mimeRegex = /data:([^;]+)/
		const mimeMatch = mimeRegex.exec(header)
		const mimeType = mimeMatch?.[1] ?? ""

		// Validate MIME type
		if (
			![
				"image/png",
				"image/jpeg",
				"image/jpg",
				"image/gif",
				"image/webp"
			].includes(mimeType)
		) {
			return {
				isValid: false,
				mimeType,
				base64Data: "",
				error: `Unsupported MIME type: ${mimeType}`
			}
		}

		// Validate base64 data
		if (!base64Data || base64Data.length === 0) {
			return {
				isValid: false,
				mimeType,
				base64Data: "",
				error: "Empty base64 data"
			}
		}

		// Try to decode base64 to validate it
		try {
			Buffer.from(base64Data, "base64")
		} catch {
			return {
				isValid: false,
				mimeType,
				base64Data: "",
				error: "Invalid base64 encoding"
			}
		}

		return { isValid: true, mimeType, base64Data }
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error"
		return {
			isValid: false,
			mimeType: "",
			base64Data: "",
			error: `Validation error: ${errorMessage}`
		}
	}
}

// Helper function to merge signatures into PDF
async function mergePDFSignatures(
	originalPdfBuffer: Buffer,
	signatures: Array<{
		id: string
		signatureValue: string
		signatureType: string
		x: number
		y: number
		width: number
		height: number
		pageNumber: number
	}>
): Promise<Buffer> {
	try {
		// Load the PDF document
		const pdfDoc = await PDFDocument.load(originalPdfBuffer)
		const pages = pdfDoc.getPages()

		for (const signature of signatures) {
			const pageIndex = signature.pageNumber - 1 // Convert to 0-based index

			if (pageIndex < 0 || pageIndex >= pages.length) {
				continue
			}

			const page = pages[pageIndex]
			if (!page) {
				continue
			}

			const { height: pageHeight } = page.getSize()

			// Calculate position (PDF coordinates start from bottom-left)
			const x = signature.x
			const y = pageHeight - signature.y - signature.height

			if (
				(signature.signatureType === "drawn" ||
					signature.signatureType === "uploaded" ||
					signature.signatureType === "default") &&
				signature.signatureValue.startsWith("data:image")
			) {
				try {
					// Validate and clean the base64 image data
					const validation = validateAndCleanBase64Image(
						signature.signatureValue
					)

					if (!validation.isValid) {
						continue
					}

					const imageBytes = Uint8Array.from(
						Buffer.from(validation.base64Data, "base64")
					)

					// Try to embed based on detected type first, then fallback
					let image
					try {
						if (validation.mimeType === "image/png") {
							image = await pdfDoc.embedPng(imageBytes)
						} else if (
							validation.mimeType === "image/jpeg" ||
							validation.mimeType === "image/jpg"
						) {
							image = await pdfDoc.embedJpg(imageBytes)
						} else {
							// Try PNG first, then JPG as fallback for other types
							try {
								image = await pdfDoc.embedPng(imageBytes)
							} catch {
								image = await pdfDoc.embedJpg(imageBytes)
							}
						}
					} catch {
						continue
					}

					// Draw the image on the page
					page.drawImage(image, {
						x,
						y,
						width: signature.width,
						height: signature.height
					})
				} catch {
					// Continue to next signature on error
				}
			} else if (signature.signatureType === "typed") {
				try {
					// Handle typed signatures
					const fontSize = Math.min(signature.height * 0.7, 24) // Scale font size based on field height

					page.drawText(signature.signatureValue, {
						x,
						y: y + signature.height * 0.2, // Center vertically
						size: fontSize,
						color: rgb(0, 0, 0) // Black color
					})
				} catch {
					// Continue to next signature on error
				}
			} else if (
				signature.signatureType === "uploaded" &&
				!signature.signatureValue.startsWith("data:image")
			) {
				// Handle uploaded files that are not base64 (e.g., URLs)
				// This would be handled differently if we had URL-based uploads
			} else if (signature.signatureType === "default") {
				// Handle default signatures - should typically be base64 images
				if (signature.signatureValue.startsWith("data:image")) {
					// This should have been handled by the main image processing block above
				}
			}
		}

		// Return the modified PDF as buffer
		const pdfBytes = await pdfDoc.save()
		return Buffer.from(pdfBytes)
	} catch (error) {
		throw new Error(
			`Failed to merge signatures into PDF: ${error instanceof Error ? error.message : "Unknown error"}`
		)
	}
}

export const signatureLiteRouter = createTRPCRouter({
	// Nested routers
	prepositioning: documentPrepositioningRouter,

	// Signature endpoints (consolidated)
	getDocumentForSigning: protectedProcedure
		.input(getDocumentForSigningSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { envelopeId, documentId } = input

			// Get document with related data
			const document = await ctx.db.document.findFirst({
				where: {
					id: documentId,
					envelopeId: envelopeId
				},
				include: {
					envelope: {
						select: {
							id: true,
							title: true,
							status: true,
							userId: true
						}
					},
					documentFields: true,
					recipients: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					}
				}
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found"
				})
			}

			// Get envelope with recipients (using envelope relation, not document relation)
			const envelope = await ctx.db.envelope.findUnique({
				where: { id: envelopeId },
				include: {
					recipient: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					}
				}
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found"
				})
			}

			// Check if user has access - either as envelope owner or as a recipient
			// First try to find an APPROVED or SIGNED recipient with fields assigned to them for this document
			let userRecipient = envelope?.recipient?.find(
				(r) =>
					r.userId === userId &&
					(r.status === "APPROVED" || r.status === "SIGNED") &&
					r.documentId === documentId &&
					document?.documentFields?.some((field) => field.recipientId === r.id)
			)

			// If no recipient with fields found, try to find any APPROVED or SIGNED recipient for this document
			userRecipient ??= envelope?.recipient?.find(
				(r) =>
					r.userId === userId &&
					(r.status === "APPROVED" || r.status === "SIGNED") &&
					r.documentId === documentId
			)

			// Last fallback: any recipient for this user and document
			userRecipient ??= envelope?.recipient?.find(
				(r) => r.userId === userId && r.documentId === documentId
			)

			// Additional fallback: any recipient for this user in this envelope (regardless of documentId)
			userRecipient ??= envelope?.recipient?.find(
				(r) =>
					r.userId === userId &&
					(r.status === "APPROVED" || r.status === "SIGNED")
			)
			const isOwner = document?.envelope?.userId === userId

			if (!userRecipient && !isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to access this document"
				})
			}

			// Get document URL using the same approach as pre-positioning page
			const documentUrl = await getDocumentPublicUrl(document.path)

			// Get fields assigned to the current user (if they're a recipient)
			const userFields = document.documentFields
				.filter((field) => {
					// If user is recipient, only show fields assigned to them
					if (userRecipient) {
						return field.recipientId === userRecipient.id
					}
					// If user is envelope owner, show all fields (for preview)
					return isOwner
				})
				.map((field) => ({
					id: field.id,
					type: field.type,
					label: field.label ?? `${field.type} Field`,
					required: field.required,
					position: {
						x: field.x,
						y: field.y,
						pageNumber: field.pageNumber
					},
					size: {
						width: field.width,
						height: field.height
					},
					placeholder: field.placeholder,
					options: field.options,
					signed: !!field.signatureValue,
					signatureValue: field.signatureValue as string | undefined
				}))

			// Transform recipients
			const recipients = envelope?.recipient?.map((recipient) => ({
				id: recipient.id,
				name: recipient.user?.name,
				email: recipient.user?.email ?? recipient.email ?? "Unknown",
				role: recipient.role,
				status: recipient.status,
				isCurrentUser: recipient.userId === userId
			}))

			return {
				id: document.id,
				name: document.name,
				url: documentUrl,
				envelope: document.envelope,
				fields: userFields,
				recipients,
				isOwner,
				currentUserRecipient: userRecipient
			}
		}),

	signField: protectedProcedure
		.input(signFieldSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { fieldId, signatureData } = input

			// Get the field and verify user access
			const field = await ctx.db.documentField.findFirst({
				where: {
					id: fieldId,
					recipient: {
						userId: userId
					}
				},
				include: {
					recipient: true,
					document: {
						include: {
							envelope: true
						}
					}
				}
			})

			if (!field) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Field not found or access denied"
				})
			}

			// Check if envelope is in the right status for signing
			console.log("Debug: Envelope status check:", {
				envelopeId: field.document.envelope?.id,
				envelopeStatus: field.document.envelope?.status,
				allowedStatuses: ["PUBLISHED", "APPROVED", "COMPLETED"],
				isAllowed: ["PUBLISHED", "APPROVED", "COMPLETED"].includes(
					field.document.envelope?.status ?? ""
				)
			})

			if (
				!["PUBLISHED", "APPROVED", "COMPLETED"].includes(
					field.document.envelope?.status ?? ""
				)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document is not available for signing"
				})
			}

			const finalSignatureValue = signatureData.value

			// TODO: For now, we'll store base64 data directly for drawn signatures
			// Storage upload will be implemented later per user request

			// Update field with signature value
			const updatedField = await ctx.db.documentField.update({
				where: {
					id: fieldId
				},
				data: {
					signatureValue: finalSignatureValue,
					signatureType: signatureData.type,
					signedAt: new Date(),
					ipAddress: signatureData.ipAddress,
					userAgent: signatureData.userAgent
				}
			})

			// Update recipient status if this was their first signature
			await ctx.db.recipient.update({
				where: { id: field.recipientId },
				data: {
					status: "SIGNED"
				}
			})

			return {
				success: true,
				fieldId: updatedField.id,
				signatureUrl: finalSignatureValue
			}
		}),

	completeDocumentSignature: protectedProcedure
		.input(completeDocumentSignatureSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { envelopeId, documentId, agreed } = input

			if (!agreed) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Must agree to terms and conditions"
				})
			}

			// Get recipient record
			const recipient = await ctx.db.recipient.findFirst({
				where: {
					userId: userId,
					documentId: documentId
				}
			})

			if (!recipient) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "You are not a recipient of this document"
				})
			}

			// Get required fields for this recipient
			const requiredFields = await ctx.db.documentField.findMany({
				where: {
					documentId: documentId,
					recipientId: recipient.id,
					required: true
				}
			})

			// Check if all required fields are signed
			const unsignedRequiredFields = requiredFields.filter(
				(field) => !field.signatureValue
			)

			if (unsignedRequiredFields.length > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Please complete all required fields. Missing: ${unsignedRequiredFields
						.map((f) => f.label ?? f.type)
						.join(", ")}`
				})
			}

			// Update recipient status to completed
			await ctx.db.recipient.update({
				where: { id: recipient.id },
				data: {
					status: "SIGNED"
				}
			})

			// Check if all recipients have signed this document
			const allRecipients = await ctx.db.recipient.findMany({
				where: {
					documentId: documentId,
					role: {
						not: "VIEWER"
					}
				}
			})

			const documentFullySigned = allRecipients.every(
				(r) => r.status === "SIGNED" || r.role === "CC"
			)

			// Check if ALL documents in the envelope have been signed
			const allEnvelopeDocuments = await ctx.db.document.findMany({
				where: { envelopeId: envelopeId },
				include: {
					recipients: {
						where: {
							role: {
								not: "VIEWER"
							}
						}
					}
				}
			})

			const allDocumentsSigned = allEnvelopeDocuments.every((doc) => {
				const signersForDoc = doc.recipients.filter((r) => r.role !== "CC")
				return (
					signersForDoc.length === 0 ||
					signersForDoc.every((r) => r.status === "SIGNED")
				)
			})

			let signedDocumentUrl: string | null = null

			if (documentFullySigned) {
				try {
					// Get the document with all signatures
					const document = await ctx.db.document.findUnique({
						where: { id: documentId },
						include: {
							documentFields: {
								where: {
									signatureValue: {
										not: null
									}
								}
							}
						}
					})

					if (document) {
						// Get all signatures for this document
						const allSignatures = await ctx.db.documentField.findMany({
							where: {
								documentId: documentId,
								signatureValue: {
									not: null
								}
							}
						})

						// Generate signed document with all signatures merged
						const supabase = getSupabaseClient()

						// Determine the correct bucket based on document path
						// Legacy files (no slashes) -> "documents", Envelope files (with slashes) -> "envelopes"
						const bucketName = document.path.includes("/")
							? "envelopes"
							: "documents"

						// Get the original document from the correct bucket
						const { data: originalFile, error: downloadError } =
							await supabase.storage.from(bucketName).download(document.path)

						if (downloadError) {
							throw new Error(
								`Failed to download original document: ${downloadError.message}`
							)
						}

						// Convert blob to buffer
						const originalPdfBuffer = Buffer.from(
							await originalFile.arrayBuffer()
						)

						// Prepare signatures for PDF merging
						const signaturesToMerge = allSignatures.map((field) => ({
							id: field.id,
							signatureValue: field.signatureValue!,
							signatureType: field.signatureType!,
							x: field.x,
							y: field.y,
							width: field.width,
							height: field.height,
							pageNumber: field.pageNumber
						}))

						// Merge signatures into PDF
						const signedPdfBuffer = await mergePDFSignatures(
							originalPdfBuffer,
							signaturesToMerge
						)

						// Create signed document path
						const signedFileName = `${envelopeId}/signed/${documentId}_signed.pdf`

						// Upload signed document to envelopes bucket
						const { data: uploadData, error: uploadError } =
							await supabase.storage
								.from("envelopes")
								.upload(signedFileName, signedPdfBuffer, {
									contentType: document.type,
									cacheControl: "3600",
									upsert: true // Allow overwriting if it already exists
								})

						if (uploadError) {
							throw new Error(
								`Failed to save signed document: ${uploadError.message}`
							)
						}

						// Get the public URL for the signed document
						const {
							data: { publicUrl }
						} = supabase.storage.from("envelopes").getPublicUrl(uploadData.path)

						signedDocumentUrl = publicUrl

						// Create signed document record and link it to the original
						const signedDocument = await ctx.db.document.create({
							data: {
								name: document.name.replace(".pdf", "_signed.pdf"),
								description: `Signed version of ${document.name}`,
								type: document.type,
								size: signedPdfBuffer.length,
								path: uploadData.path,
								envelopeId: envelopeId
							}
						})

						// Update original document to reference the signed version
						await ctx.db.document.update({
							where: { id: documentId },
							data: {
								signedDocId: signedDocument.id
							}
						})
					}
				} catch {
					// Continue with envelope completion even if signed document save fails
				}

				// Only update envelope status to completed if ALL documents are signed
				if (allDocumentsSigned) {
					await ctx.db.envelope.update({
						where: { id: envelopeId },
						data: {
							status: "COMPLETED"
						}
					})
				}
			}

			return {
				success: true,
				allDocumentsSigned: allDocumentsSigned,
				documentFullySigned: documentFullySigned,
				signedDocumentUrl
			}
		}),

	// Get signed document URL if available
	getSignedDocument: protectedProcedure
		.input(
			z.object({
				documentId: z.string().min(1, "Document ID is required")
			})
		)
		.query(async ({ ctx, input }) => {
			const { documentId } = input
			const userId = ctx.session.user.id

			// Get document with signed version
			const document = await ctx.db.document.findFirst({
				where: {
					id: documentId
				},
				include: {
					signedDoc: true,
					envelope: true,
					recipients: {
						where: {
							userId: userId
						}
					}
				}
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found"
				})
			}

			// Check if user has access (owner or recipient)
			const isOwner = document.envelope?.userId === userId
			const isRecipient = document.recipients.length > 0

			if (!isOwner && !isRecipient) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to access this document"
				})
			}

			if (!document.signedDoc) {
				return {
					hasSignedVersion: false,
					signedDocumentUrl: null
				}
			}

			// Get signed document URL
			const supabase = getSupabaseClient()
			const {
				data: { publicUrl }
			} = supabase.storage
				.from("envelopes")
				.getPublicUrl(document.signedDoc.path)

			return {
				hasSignedVersion: true,
				signedDocumentUrl: publicUrl,
				signedDocument: {
					id: document.signedDoc.id,
					name: document.signedDoc.name,
					path: document.signedDoc.path,
					createdAt: document.signedDoc.createdAt
				}
			}
		}),

	// Upload a document to start the envelope creation process
	uploadDocument: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, "Document name is required"),
				file: z.string(), // Base64 encoded file
				mimeType: z.string(),
				size: z.number(),
				description: z.string().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { name, file, mimeType, size } = input

			try {
				// Create document record in database
				const document = await ctx.db.document.create({
					data: {
						name,
						path: "", // Will be updated after upload
						type: mimeType,
						size
					}
				})

				// Upload to Supabase storage
				const supabase = getSupabaseClient()
				const fileName = `${document.id}/${name}`

				// Decode base64 file data
				const fileBuffer = Buffer.from(file, "base64")

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("documents")
					.upload(fileName, fileBuffer, {
						contentType: mimeType,
						cacheControl: "3600"
					})

				if (uploadError) {
					// Clean up database record if upload fails
					await ctx.db.document.delete({ where: { id: document.id } })
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Upload failed: ${uploadError.message}`
					})
				}

				// Update document with storage path
				const updatedDocument = await ctx.db.document.update({
					where: { id: document.id },
					data: { path: uploadData.path }
				})

				// Get public URL for the document
				const {
					data: { publicUrl }
				} = supabase.storage.from("documents").getPublicUrl(uploadData.path)

				return {
					...updatedDocument,
					url: publicUrl
				}
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Upload failed"
				})
			}
		}),

	// Get document details for editing
	getDocumentForEditing: protectedProcedure
		.input(getDocumentForEditingSchema)
		.query(async ({ ctx, input }) => {
			const document = await ctx.db.document.findUnique({
				where: { id: input.documentId },
				include: {
					envelope: {
						include: {
							recipient: true
						}
					},
					documentFields: true
				}
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found"
				})
			}

			// Check if user owns the document (through envelope)
			if (
				document.envelope &&
				document.envelope.userId !== ctx.session.user.id
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to access this document"
				})
			}

			// Get Supabase public URL for the document
			const supabase = getSupabaseClient()
			const {
				data: { publicUrl }
			} = supabase.storage.from("documents").getPublicUrl(document.path)

			return {
				...document,
				url: publicUrl
			}
		}),

	// Create envelope with recipients and document fields
	createEnvelope: protectedProcedure
		.input(createEnvelopeSchema)
		.mutation(async ({ ctx, input }) => {
			const { documentId, title, description, recipients, fields } = input

			// Check if document exists and user has access
			const document = await ctx.db.document.findUnique({
				where: { id: documentId }
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found"
				})
			}

			// Check if document is already assigned to an envelope
			if (document.envelopeId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document is already assigned to an envelope"
				})
			}

			try {
				// Create envelope with recipients and fields in a transaction
				const envelope = await ctx.db.$transaction(async (tx) => {
					// Create the envelope
					const newEnvelope = await tx.envelope.create({
						data: {
							title,
							description,
							userId: ctx.session.user.id,
							status: "DRAFT"
						}
					})

					// Update document to link to envelope
					await tx.document.update({
						where: { id: documentId },
						data: { envelopeId: newEnvelope.id }
					})

					// Create recipients
					const createdRecipients = await Promise.all(
						recipients.map((recipient) =>
							tx.recipient.create({
								data: {
									role: recipient.role,
									status: "PENDING",
									email: recipient.email,
									name: recipient.name,
									envelopeId: newEnvelope.id,
									documentId: documentId
								}
							})
						)
					)

					// Create document fields
					const createdFields = await Promise.all(
						fields.map((field) => {
							const recipient = createdRecipients.find(
								(r) =>
									r.email ===
									recipients.find((rec) => rec.email === field.recipientId)
										?.email
							)
							if (!recipient) {
								throw new TRPCError({
									code: "BAD_REQUEST",
									message: `Recipient not found for field: ${field.label}`
								})
							}

							return tx.documentField.create({
								data: {
									documentId: documentId,
									recipientId: recipient.id,
									type: field.type,
									label: field.label,
									placeholder: field.placeholder,
									required: field.required,
									options: field.options ?? [],
									x: field.position.x,
									y: field.position.y,
									width: field.size.width,
									height: field.size.height,
									pageNumber: field.position.pageNumber
								}
							})
						})
					)

					return {
						...newEnvelope,
						recipients: createdRecipients,
						document: {
							...document,
							documentFields: createdFields
						}
					}
				})

				return envelope
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "Failed to create envelope"
				})
			}
		}),

	// Get envelope with documents and recipients for sending
	getEnvelopeForSending: protectedProcedure
		.input(z.object({ envelopeId: z.string() }))
		.query(async ({ ctx, input }) => {
			const envelope = await ctx.db.envelope.findUnique({
				where: { id: input.envelopeId },
				include: {
					recipient: true,
					documents: {
						include: {
							documentFields: true
						}
					}
				}
			})

			if (!envelope) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Envelope not found"
				})
			}

			// Check if user owns the envelope
			if (envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to access this envelope"
				})
			}

			return envelope
		}),

	// Get document field progress for current user
	getDocumentFieldProgress: protectedProcedure
		.input(getDocumentForSigningSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { documentId } = input

			// Get user's recipient record for this document
			const recipient = await ctx.db.recipient.findFirst({
				where: {
					userId: userId,
					documentId: documentId
				}
			})

			if (!recipient) {
				return {
					totalFields: 0,
					signedFields: 0,
					totalRequiredFields: 0,
					signedRequiredFields: 0,
					progress: 0,
					allRequiredFieldsSigned: false
				}
			}

			// Get all fields assigned to this recipient
			const allFields = await ctx.db.documentField.findMany({
				where: {
					documentId: documentId,
					recipientId: recipient.id
				}
			})

			// Count signed fields (those with signatureValue)
			const signedFields = allFields.filter(
				(field) => field.signatureValue !== null && field.signatureValue !== ""
			)

			// Count required fields and signed required fields
			const requiredFields = allFields.filter((field) => field.required)
			const signedRequiredFields = requiredFields.filter(
				(field) => field.signatureValue !== null && field.signatureValue !== ""
			)

			const totalFields = allFields.length
			const signedCount = signedFields.length
			const totalRequiredFields = requiredFields.length
			const signedRequiredCount = signedRequiredFields.length
			const progress =
				totalFields > 0 ? Math.round((signedCount / totalFields) * 100) : 0
			const allRequiredFieldsSigned =
				totalRequiredFields > 0 && signedRequiredCount === totalRequiredFields

			return {
				totalFields,
				signedFields: signedCount,
				totalRequiredFields,
				signedRequiredFields: signedRequiredCount,
				progress,
				allRequiredFieldsSigned
			}
		}),

	// Send envelope for signatures
	sendEnvelope: protectedProcedure
		.input(sendEnvelopeSchema)
		.mutation(async ({ ctx, input }) => {
			const { envelopeId } = input

			const envelope = await ctx.db.envelope.findUnique({
				where: { id: envelopeId },
				include: {
					recipient: true
				}
			})

			if (!envelope) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Envelope not found"
				})
			}

			// Check if user owns the envelope
			if (envelope.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to send this envelope"
				})
			}

			// Check if envelope has recipients
			if (envelope.recipient.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Envelope must have at least one recipient"
				})
			}

			try {
				// Update envelope status to published
				const updatedEnvelope = await ctx.db.envelope.update({
					where: { id: envelopeId },
					data: {
						status: "PUBLISHED"
					}
				})

				// TODO: Send email notifications to recipients
				// This would integrate with your email service

				return updatedEnvelope
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "Failed to send envelope"
				})
			}
		})
})
