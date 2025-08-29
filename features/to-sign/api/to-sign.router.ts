import { TRPCError } from "@trpc/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

import { notifySignatureComplete } from "@/services/email/email-notifications"
import { getSupabaseClient } from "@/services/supabase"
import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import {
	createTestDocumentSchema,
	findDocumentByIdSchema,
	getEnvelopeToSignSchema,
	getPdfProxySchema,
	listEnvelopesToSignSchema,
	signDocumentSchema
} from "./to-sign.schemas"

// Helper function to determine the correct bucket based on path format
function getBucketName(path: string): string {
	// Legacy file upload: simple filename without slashes -> "documents" bucket
	// Envelope system: nested path with slashes -> "envelopes" bucket
	return path.includes("/") ? "envelopes" : "documents"
}

export const toSignRouter = createTRPCRouter({
	// List envelopes that need to be signed by the current user
	listEnvelopesToSign: publicProcedure
		.input(listEnvelopesToSignSchema)
		.query(async ({ ctx, input }) => {
			const { status, limit = 10, offset = 0, userId } = input

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID is required"
				})
			}

			// Build filter for envelopes where the user is a recipient
			const baseWhere = {
				documents: {
					some: {
						recipients: {
							some: {
								userId: userId,
								role: "SIGNER" as const
							}
						}
					}
				}
			}

			let where
			// Add status-specific filters
			if (status === "PENDING") {
				// For pending: envelope is PUBLISHED and user hasn't signed yet
				where = {
					...baseWhere,
					status: "PUBLISHED" as const,
					documents: {
						some: {
							recipients: {
								some: {
									userId: userId,
									role: "SIGNER" as const,
									status: "PENDING" as const
								}
							}
						}
					}
				}
			} else if (status === "SIGNED") {
				// For signed: user has signed their documents (envelope can be COMPLETED or still PUBLISHED)
				where = {
					...baseWhere,
					documents: {
						some: {
							recipients: {
								some: {
									userId: userId,
									role: "SIGNER" as const,
									status: "SIGNED" as const
								}
							}
						}
					}
				}
			} else {
				// Default to PUBLISHED envelopes
				where = {
					...baseWhere,
					status: "PUBLISHED" as const
				}
			}

			const [envelopes, total] = await Promise.all([
				ctx.db.envelope.findMany({
					where,
					include: {
						documents: {
							include: {
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
								},
								signedDoc: true // Include signed version for URL generation
							}
						},
						createdBy: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
					},
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset
				}),
				ctx.db.envelope.count({ where })
			])

			// Transform to match expected interface and filter documents for current user
			const supabase = getSupabaseClient()
			const transformedEnvelopes = envelopes
				.map((envelope) => ({
					...envelope,
					documents: envelope.documents
						.filter((doc) => {
							// Only include documents where the user is a recipient
							const userRecipients = doc.recipients.filter(
								(r) => r.userId === userId && r.role === "SIGNER"
							)
							if (userRecipients.length === 0) return false

							// Apply status-specific filtering
							if (status === "PENDING") {
								return userRecipients.some((r) => r.status === "PENDING")
							} else if (status === "SIGNED") {
								return userRecipients.some((r) => r.status === "SIGNED")
							}
							return true
						})
						.map((doc) => {
							// Use the signed version for URL if it exists, otherwise use original
							const displayDocument = doc.signedDoc ?? doc
							const {
								data: { publicUrl }
							} = supabase.storage
								.from(getBucketName(displayDocument.path))
								.getPublicUrl(displayDocument.path)

							return {
								...doc,
								url: publicUrl,
								// Include info about which version is being displayed
								displayPath: displayDocument.path,
								isSignedVersion: !!doc.signedDoc,
								recipients: doc.recipients.map((recipient) => ({
									id: recipient.id,
									role: recipient.role,
									status: recipient.status,
									userId: recipient.userId,
									user: recipient.user
										? {
												id: recipient.user.id,
												name: recipient.user.name,
												email: recipient.user.email
											}
										: {
												id: "",
												name: null,
												email: null
											}
								}))
							}
						})
				}))
				.filter((envelope) => envelope.documents.length > 0) // Only include envelopes with documents for this user

			return {
				envelopes: transformedEnvelopes,
				total
			}
		}),

	// Get a specific envelope to sign
	getEnvelopeToSign: publicProcedure
		.input(getEnvelopeToSignSchema)
		.query(async ({ ctx, input }) => {
			const envelope = await ctx.db.envelope.findUnique({
				where: { id: input.envelopeId },
				include: {
					documents: {
						include: {
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
							},
							signedDoc: true // Include signed version for URL generation
						}
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							email: true
						}
					}
				}
			})

			if (!envelope) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Envelope not found."
				})
			}

			// Transform documents to include URL and recipients
			const supabase = getSupabaseClient()
			const transformedEnvelope = {
				...envelope,
				documents: envelope.documents.map((doc) => {
					// Use the signed version for URL if it exists, otherwise use original
					const displayDocument = doc.signedDoc ?? doc
					const {
						data: { publicUrl }
					} = supabase.storage
						.from(getBucketName(displayDocument.path))
						.getPublicUrl(displayDocument.path)

					return {
						...doc,
						url: publicUrl,
						// Include info about which version is being displayed
						displayPath: displayDocument.path,
						isSignedVersion: !!doc.signedDoc,
						recipients: doc.recipients.map((recipient) => ({
							id: recipient.id,
							role: recipient.role,
							status: recipient.status,
							userId: recipient.userId,
							user: recipient.user
								? {
										id: recipient.user.id,
										name: recipient.user.name,
										email: recipient.user.email
									}
								: {
										id: "",
										name: null,
										email: null
									}
						}))
					}
				})
			}

			return transformedEnvelope
		}),

	// Get document info for PDF preview
	findDocumentById: publicProcedure
		.input(findDocumentByIdSchema)
		.query(async ({ ctx, input }) => {
			const document = await ctx.db.document.findUnique({
				where: { id: input.id },
				include: {
					envelope: {
						include: {
							createdBy: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					},
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
					},
					signedDoc: true // Include signed version if exists
				}
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found."
				})
			}

			// Use the signed version if it exists, otherwise use the original
			const displayDocument = document.signedDoc ?? document
			const supabase = getSupabaseClient()
			const {
				data: { publicUrl }
			} = supabase.storage
				.from(getBucketName(displayDocument.path))
				.getPublicUrl(displayDocument.path)

			return {
				...document,
				url: publicUrl,
				// Include info about which version is being displayed
				displayPath: displayDocument.path,
				isSignedVersion: !!document.signedDoc
			}
		}),

	// Proxy endpoint to fetch PDF from Supabase to avoid CORS issues
	getPdfProxy: publicProcedure
		.input(getPdfProxySchema)
		.query(async ({ ctx, input }) => {
			const { documentId } = input

			try {
				console.log(`PDF Proxy: Looking for document with ID: ${documentId}`)

				// Find the document to get its path, include signed version
				const document = await ctx.db.document.findUnique({
					where: { id: documentId },
					include: {
						signedDoc: true
					}
				})

				if (!document) {
					console.error(
						`PDF Proxy: Document with ID "${documentId}" not found in database`
					)
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Document not found. ID: ${documentId}. Please ensure the document exists in the database or use a direct URL instead of proxy.`
					})
				}

				// Use the signed version if it exists, otherwise use the original
				const displayDocument = document.signedDoc ?? document
				const displayPath = displayDocument.path
				const displayName = displayDocument.name
				const bucketName = getBucketName(displayPath)

				console.log(`PDF Proxy: Found document:`, {
					id: documentId,
					name: document.name,
					originalPath: document.path,
					displayPath,
					displayName,
					envelopeId: document.envelopeId,
					bucket: bucketName,
					isSignedVersion: !!document.signedDoc
				})

				// Get the Supabase client
				const supabase = getSupabaseClient()

				// Download the PDF from Supabase storage (use display path - signed version if exists)
				console.log(
					`PDF Proxy: Attempting to download from bucket "${bucketName}" with path "${displayPath}"`
				)
				const { data, error } = await supabase.storage
					.from(bucketName)
					.download(displayPath)

				if (error ?? !data) {
					console.error(`PDF Proxy: Failed to download PDF:`, {
						originalPath: document.path,
						displayPath,
						bucket: bucketName,
						error: error?.message,
						errorDetails: error
					})
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Failed to download PDF from path "${displayPath}" in bucket "${bucketName}": ${error?.message ?? "File not found"}`
					})
				}

				console.log(
					`PDF Proxy: Successfully downloaded PDF, size: ${data.size} bytes`
				)

				// Convert blob to base64 for transmission
				const arrayBuffer = await data.arrayBuffer()
				const buffer = Buffer.from(arrayBuffer)
				const base64 = buffer.toString("base64")

				return {
					data: base64,
					contentType: "application/pdf",
					filename: displayName
				}
			} catch (error) {
				console.error("Error in PDF proxy:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to fetch PDF: ${error instanceof Error ? error.message : "Unknown error"}`
				})
			}
		}),

	// Test endpoint to create a temporary document record for proxy testing
	createTestDocument: publicProcedure
		.input(createTestDocumentSchema)
		.mutation(async ({ ctx, input }) => {
			const { name, path, envelopeId } = input

			try {
				// Check if document already exists with this path
				const existingDoc = await ctx.db.document.findFirst({
					where: { path }
				})

				if (existingDoc) {
					return {
						id: existingDoc.id,
						name: existingDoc.name,
						path: existingDoc.path,
						message: "Using existing document record"
					}
				}

				// Find or create a test user first
				let testUser = await ctx.db.user.findFirst({
					where: { email: "test@example.com" }
				})

				testUser ??= await ctx.db.user.create({
					data: {
						email: "test@example.com",
						name: "Test User",
						password: "test", // In production, this would be hashed
						role: "CLIENT" // Adjust based on your Role enum
					}
				})

				// Create test envelope if it doesn't exist
				let envelope = await ctx.db.envelope.findUnique({
					where: { id: envelopeId }
				})

				envelope ??= await ctx.db.envelope.create({
					data: {
						id: envelopeId,
						title: "Test Envelope for PDF Proxy",
						description:
							"Temporary envelope for testing PDF proxy functionality",
						status: "PUBLISHED",
						userId: testUser.id // Use the real test user ID
					}
				})

				// Create a temporary document record
				const document = await ctx.db.document.create({
					data: {
						name,
						type: "application/pdf",
						size: 0, // Unknown size for test
						path,
						envelopeId
					}
				})

				return {
					id: document.id,
					name: document.name,
					path: document.path,
					message: "Test document record created successfully"
				}
			} catch (error) {
				console.error("Error creating test document:", error)

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to create test document: ${error instanceof Error ? error.message : "Unknown error"}`
				})
			}
		}),

	// Sign a document with signature
	signDocument: publicProcedure
		.input(signDocumentSchema)
		.mutation(async ({ ctx, input }) => {
			const {
				documentId,
				envelopeId,
				signatureText,
				signatureImage,
				position,
				size,
				userId
			} = input

			try {
				// Get the document with recipients and signed version info
				const document = await ctx.db.document.findUnique({
					where: { id: documentId },
					include: {
						envelope: true,
						recipients: {
							include: {
								user: true
							}
						},
						signedDoc: true // Include the current signed version if exists
					}
				})

				if (!document) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Document not found"
					})
				}

				if (document.envelopeId !== envelopeId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Document does not belong to specified envelope"
					})
				}

				// Find the recipient record for this user and document
				const recipient = document.recipients.find(
					(r) => r.userId === userId && r.role === "SIGNER"
				)

				if (!recipient) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You are not authorized to sign this document"
					})
				}

				if (recipient.status === "SIGNED") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "You have already signed this document"
					})
				}

				const supabase = getSupabaseClient()

				// Determine which PDF to use as base:
				// - If there's a signed version, use that (for subsequent signers)
				// - Otherwise, use the original document (for first signer)
				const baseDocument = document.signedDoc ?? document
				const basePath = baseDocument.path
				const bucketName = getBucketName(basePath)

				console.log("Signing document:", {
					documentId,
					originalPath: document.path,
					basePath,
					isFirstSigner: !document.signedDoc,
					bucket: bucketName
				})

				// Download the base PDF (either original or latest signed version)
				const { data: pdfData, error: downloadError } = await supabase.storage
					.from(bucketName)
					.download(basePath)

				if (downloadError || !pdfData) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to download PDF: ${downloadError?.message ?? "Unknown error"}`
					})
				}

				// Convert blob to array buffer
				const pdfArrayBuffer = await pdfData.arrayBuffer()

				// Load the PDF document
				const pdfDoc = await PDFDocument.load(pdfArrayBuffer)
				const pages = pdfDoc.getPages()

				// Validate page number
				if (position.pageNumber < 1 || position.pageNumber > pages.length) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid page number. Document has ${pages.length} pages.`
					})
				}

				const page = pages[position.pageNumber - 1] // Convert to 0-based index
				if (!page) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Page ${position.pageNumber} not found in document`
					})
				}

				const pageHeight = page.getHeight()

				// Add signature to the PDF
				if (signatureImage) {
					// Handle image signature
					const imageParts = signatureImage.split(",")
					if (imageParts.length !== 2) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Invalid image format. Expected base64 data URL."
						})
					}

					const imageBytes = Uint8Array.from(atob(imageParts[1]!), (c) =>
						c.charCodeAt(0)
					)

					let image
					try {
						// Try PNG first, then JPEG
						if (signatureImage.includes("data:image/png")) {
							image = await pdfDoc.embedPng(imageBytes)
						} else {
							image = await pdfDoc.embedJpg(imageBytes)
						}
					} catch {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Invalid image format. Please use PNG or JPEG."
						})
					}

					// Calculate signature dimensions
					const signatureWidth = size?.width ?? 150
					const signatureHeight = size?.height ?? 50

					// Convert position from PDF viewer ratios to PDF coordinates
					// The frontend sends position ratios (0-1), convert to PDF page coordinates
					const pageWidth = page.getWidth()

					// Convert ratios to PDF coordinates
					// Frontend click position is center of signature, so we need to adjust for signature dimensions
					const pdfX = position.x * pageWidth - signatureWidth / 2
					const pdfY = (1 - position.y) * pageHeight - signatureHeight / 2

					console.log("PDF Signing - Position conversion:", {
						receivedPosition: position,
						pageWidth,
						pageHeight,
						signatureWidth,
						signatureHeight,
						calculatedPdfX: pdfX,
						calculatedPdfY: pdfY,
						note: "Position adjusted to center signature at click point"
					})

					page.drawImage(image, {
						x: pdfX,
						y: pdfY,
						width: signatureWidth,
						height: signatureHeight
					})
				} else if (signatureText) {
					// Handle text signature
					const fontSize = size?.height ?? 20
					const font = await pdfDoc.embedFont(
						StandardFonts.HelveticaBoldOblique
					)

					// Convert position from PDF viewer ratios to PDF coordinates
					const pageWidth = page.getWidth()
					const pdfX = position.x * pageWidth - fontSize / 4 // Center text horizontally (rough estimate)
					const pdfY = (1 - position.y) * pageHeight - fontSize / 2 // Center text vertically

					console.log("PDF Signing - Text position conversion:", {
						receivedPosition: position,
						pageWidth,
						pageHeight,
						fontSize,
						calculatedPdfX: pdfX,
						calculatedPdfY: pdfY,
						note: "Position adjusted to center text at click point"
					})

					page.drawText(signatureText, {
						x: pdfX,
						y: pdfY,
						size: fontSize,
						font: font,
						color: rgb(0, 0, 1) // Blue color for signature
					})
				} else {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Either signatureImage or signatureText must be provided"
					})
				}

				// Generate the signed PDF
				const signedPdfBytes = await pdfDoc.save()

				// Create file path in the signed folder structure: [envelopeId]/signed/[documentId]_signed.pdf
				const originalName = document.name
				const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "")
				const extension = originalName.split(".").pop()
				const signedFileName = `${nameWithoutExt}_signed.${extension}`
				const signedFilePath = `${envelopeId}/signed/${documentId}_signed.${extension}`

				// Upload the signed PDF to Supabase
				// Use upsert: true to replace if it already exists
				const signedBucketName = "envelopes" // Always use envelopes bucket for signed docs

				// If there's already a signed version, we need to replace it
				if (document.signedDoc) {
					console.log(
						"Replacing existing signed document:",
						document.signedDoc.path
					)
					// Delete the old signed version first
					await supabase.storage
						.from(signedBucketName)
						.remove([document.signedDoc.path])
				}

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from(signedBucketName)
					.upload(signedFilePath, signedPdfBytes, {
						contentType: "application/pdf",
						duplex: "half",
						upsert: true // Replace if exists
					})

				if (uploadError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to upload signed PDF: ${uploadError.message}`
					})
				}

				let signedDocument
				if (document.signedDoc) {
					// Update the existing signed document record
					signedDocument = await ctx.db.document.update({
						where: { id: document.signedDoc.id },
						data: {
							name: signedFileName,
							size: signedPdfBytes.length,
							path: uploadData.path,
							updatedAt: new Date()
						}
					})
				} else {
					// Create a new document record for the signed version
					signedDocument = await ctx.db.document.create({
						data: {
							name: signedFileName,
							type: "application/pdf",
							size: signedPdfBytes.length,
							path: uploadData.path,
							envelopeId: envelopeId,
							unsignedDocId: documentId // Link to the original document
						}
					})

					// Update the original document to reference the signed version
					await ctx.db.document.update({
						where: { id: documentId },
						data: {
							signedDocId: signedDocument.id
						}
					})
				}

				// Update recipient status to SIGNED
				await ctx.db.recipient.update({
					where: { id: recipient.id },
					data: {
						status: "SIGNED"
					}
				})

				// Log RECIPIENT_SIGNED audit event (non-blocking)
				try {
					await ctx.db.auditEvent.create({
						data: {
							eventType: "RECIPIENT_SIGNED",
							description: `Document "${document.name}" was signed by ${recipient.user?.name ?? recipient.user?.email ?? "Unknown User"}`,
							userEmail: recipient.user?.email,
							userName: recipient.user?.name,
							envelopeId: envelopeId,
							documentId: documentId,
							recipientId: recipient.id,
							metadata: {
								recipientEmail: recipient.user?.email,
								recipientName:
									recipient.user?.name ??
									recipient.user?.email ??
									"Unknown User",
								documentName: document.name,
								signatureType: signatureImage ? "image" : "text",
								signedAt: new Date().toISOString()
							}
						}
					})
				} catch (auditError) {
					// Log the error but don't fail the signing process
					console.error("Failed to create audit event for signing:", auditError)
				}

				// Check if all recipients in the envelope have signed their documents
				// Get all documents in the envelope with their recipients
				const envelopeDocuments = await ctx.db.document.findMany({
					where: { envelopeId },
					include: {
						recipients: {
							where: { role: "SIGNER" }
						}
					}
				})

				// Check if all signers have signed their documents
				let allSigned = true
				for (const doc of envelopeDocuments) {
					const signersForDoc = doc.recipients.filter(
						(r) => r.role === "SIGNER"
					)
					if (signersForDoc.some((r) => r.status !== "SIGNED")) {
						allSigned = false
						break
					}
				}

				// Update envelope status based on whether there are approvers
				if (allSigned) {
					// Check if there are any envelope-level approvers
					const approvers = await ctx.db.recipient.findMany({
						where: {
							envelopeId,
							role: "APPROVER"
						}
					})

					// If there are approvers, set to PENDING_APPROVAL, otherwise COMPLETED
					const newStatus =
						approvers.length > 0 ? "PENDING_APPROVAL" : "COMPLETED"

					const updatedEnvelope = await ctx.db.envelope.update({
						where: { id: envelopeId },
						data: {
							status: newStatus
						},
						include: {
							createdBy: {
								select: {
									id: true,
									name: true,
									email: true
								}
							},
							documents: {
								select: {
									id: true,
									name: true
								}
							},
							recipient: {
								where: {
									role: "SIGNER"
								},
								include: {
									user: {
										select: {
											name: true,
											email: true
										}
									}
								}
							}
						}
					})

					// Send completion notification if envelope is completed (no approvers needed)
					if (newStatus === "COMPLETED" && updatedEnvelope.createdBy?.email) {
						try {
							await notifySignatureComplete({
								recipient: {
									email: updatedEnvelope.createdBy.email,
									name: updatedEnvelope.createdBy.name
								},
								envelope: {
									id: updatedEnvelope.id,
									title: updatedEnvelope.title,
									description: updatedEnvelope.description
								},
								documents: updatedEnvelope.documents,
								completionDate: new Date(),
								signers: updatedEnvelope.recipient
									.map((r) => ({
										name: r.user?.name,
										email: r.user?.email ?? ""
									}))
									.filter((s) => s.email) // Filter out any signers without email
							})
						} catch (emailError) {
							console.error(
								`❌ Failed to send completion notification to envelope creator ${updatedEnvelope.createdBy.email}:`,
								emailError
							)
							// Don't throw error to prevent failing the signing process
						}
					}
				}

				// Get the public URL for the signed document
				const {
					data: { publicUrl }
				} = supabase.storage
					.from(signedBucketName)
					.getPublicUrl(uploadData.path)

				return {
					id: signedDocument.id,
					originalName: document.name,
					signedName: signedFileName,
					signedUrl: publicUrl,
					signedPath: uploadData.path,
					message: "Document signed successfully",
					recipientStatus: "SIGNED",
					envelopeCompleted: allSigned
				}
			} catch (error) {
				console.error("Error signing document:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to sign document: ${error instanceof Error ? error.message : "Unknown error"}`
				})
			}
		}),

	// Debug endpoint to list documents and bucket contents
	debugDocuments: publicProcedure.query(async ({ ctx }) => {
		try {
			// Get all documents from database
			const documents = await ctx.db.document.findMany({
				select: {
					id: true,
					name: true,
					path: true,
					envelopeId: true,
					createdAt: true
				},
				orderBy: {
					createdAt: "desc"
				},
				take: 10
			})

			// Get Supabase client and list both bucket contents
			const supabase = getSupabaseClient()

			const { data: envelopesBucketFiles, error: envelopesError } =
				await supabase.storage.from("envelopes").list("")

			const { data: documentsBucketFiles, error: documentsError } =
				await supabase.storage.from("documents").list("")

			console.log("Debug: Documents in database:", documents)
			console.log("Debug: Files in envelopes bucket:", envelopesBucketFiles)
			console.log("Debug: Files in documents bucket:", documentsBucketFiles)

			return {
				buckets: {
					envelopes: {
						files: envelopesBucketFiles ?? [],
						error: envelopesError?.message
					},
					documents: {
						files: documentsBucketFiles ?? [],
						error: documentsError?.message
					}
				},
				documents
			}
		} catch (error) {
			console.error("Error in debug endpoint:", error)
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Debug failed: ${error instanceof Error ? error.message : "Unknown error"}`
			})
		}
	})
})
