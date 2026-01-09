import { TRPCError } from "@trpc/server"
import { desc, eq, and, isNotNull, count } from "drizzle-orm"
import { z } from "zod/v4"

import { documents } from "@/services/drizzle/schema/document"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { users } from "@/services/drizzle/schema/auth"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { getPassportDocument, downloadCertificate } from "@/services/docochain"
import { getPublicClient } from "@/services/supabase"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

const getNotarialBookSchema = z.object({
	page: z.number().min(1).default(1),
	perPage: z.number().min(1).max(100).default(50),
	search: z.string().optional(),
	actType: z.enum(["ALL", "ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"]).default("ALL"),
	workflow: z.enum(["ALL", "REN", "IEN"]).default("ALL"),
})

const syncDocumentToNotarialBookSchema = z.object({
	documentId: z.string().min(1),
	projectUuid: z.string().min(1),
	actType: z.enum(["ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"]),
})

/**
 * Extract principal and witness information from passport data
 */
function extractSignerInfo(passportData: any) {
	const signers: Array<{
		name: string
		email: string
		role: string
		signedAt?: string
	}> = []

	// Try different possible structures from DocoChain Passport API
	if (passportData?.data?.signers) {
		signers.push(...passportData.data.signers)
	} else if (passportData?.signers) {
		signers.push(...passportData.signers)
	} else if (passportData?.data?.history) {
		// Extract from history/audit trail
		const history = Array.isArray(passportData.data.history) 
			? passportData.data.history 
			: passportData.history || []
		
		history.forEach((event: any) => {
			if (event.signer) {
				signers.push({
					name: event.signer.name || event.signer.first_name + " " + event.signer.last_name || "Unknown",
					email: event.signer.email || "",
					role: event.signer.role || event.signer.signer_role || "SIGNER",
					signedAt: event.timestamp || event.signed_at,
				})
			}
		})
	}

	// Identify principal (usually first signer or role "PRINCIPAL")
	const principal = signers.find(s => 
		s.role?.toUpperCase().includes("PRINCIPAL") || 
		s.role?.toUpperCase().includes("SIGNER")
	) || signers[0]

	// Identify witness (role "WITNESS")
	const witness = signers.find(s => 
		s.role?.toUpperCase().includes("WITNESS")
	)

	return { principal, witness, allSigners: signers }
}

/**
 * Determine act type from document or passport data
 */
function determineActType(
	documentName: string,
	documentDescription: string | null,
	passportData: any
): "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING" {
	const combinedText = `${documentName} ${documentDescription || ""}`.toLowerCase()
	
	// Check for keywords
	if (combinedText.includes("acknowledgment") || combinedText.includes("acknowledge")) {
		return "ACKNOWLEDGMENT"
	}
	if (combinedText.includes("affirmation") || combinedText.includes("affirm")) {
		return "AFFIRMATION"
	}
	if (combinedText.includes("jurat") || combinedText.includes("sworn")) {
		return "JURAT"
	}
	if (combinedText.includes("witness") || combinedText.includes("witnessing")) {
		return "SIGNATURE_WITNESSING"
	}
	
	// Default to acknowledgment (most common)
	return "ACKNOWLEDGMENT"
}

export const notarialBookRouter = createTRPCRouter({
	/**
	 * Get notarial book entries for the current ENP
	 * Uses Doc On Chain Passport API to fetch document history
	 */
	getNotarialBook: protectedProcedure
		.input(getNotarialBookSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { page, perPage, search, actType, workflow } = input

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access the notarial book",
				})
			}

			// Get or create notarial book for this ENP
			let notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.enpId, userId),
			})

			if (!notarialBook) {
				// Create notarial book if it doesn't exist
				const [created] = await ctx.db
					.insert(notarialBooks)
					.values({
						enpId: userId,
					})
					.returning()
				
				notarialBook = created!
			}

			// Build query filters
			const filters = [eq(notarialActs.notarialBookId, notarialBook.id)]

			if (actType !== "ALL") {
				filters.push(eq(notarialActs.actType, actType))
			}

			if (workflow !== "ALL") {
				filters.push(eq(notarialActs.workflow, workflow))
			}

			// Get notarial acts with pagination
			const acts = await ctx.db
				.select()
				.from(notarialActs)
				.where(and(...filters))
				.orderBy(desc(notarialActs.executedAt))
				.limit(perPage)
				.offset((page - 1) * perPage)

			// Get total count using proper count function
			const [totalResult] = await ctx.db
				.select({ count: count() })
				.from(notarialActs)
				.where(and(...filters))

			const total = totalResult?.count ?? 0

			// Filter by search term if provided
			let filteredActs = acts
			if (search) {
				const searchLower = search.toLowerCase()
				filteredActs = acts.filter(act =>
					act.principalName.toLowerCase().includes(searchLower) ||
					act.documentName?.toLowerCase().includes(searchLower) ||
					act.certificateNumber?.toLowerCase().includes(searchLower)
				)
			}

			return {
				acts: filteredActs,
				total,
				page,
				perPage,
				totalPages: Math.ceil(total / perPage),
			}
		}),

	/**
	 * Sync a completed document to the notarial book
	 * Fetches passport data from Doc On Chain and creates/updates notarial act entry
	 */
	syncDocumentToNotarialBook: protectedProcedure
		.input(syncDocumentToNotarialBookSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { documentId, projectUuid, actType } = input

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can sync documents to notarial book",
				})
			}

			// Get document
			const document = await ctx.db.query.documents.findFirst({
				where: eq(documents.id, documentId),
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// Get or create notarial book
			let notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.enpId, userId),
			})

			if (!notarialBook) {
				const [created] = await ctx.db
					.insert(notarialBooks)
					.values({
						enpId: userId,
					})
					.returning()
				
				notarialBook = created!
			}

			// Check if act already exists for this document
			const existingAct = await ctx.db.query.notarialActs.findFirst({
				where: and(
					eq(notarialActs.notarialBookId, notarialBook.id),
					eq(notarialActs.documentId, documentId)
				),
			})

			// Fetch passport data from Doc On Chain
			let passportData: any = null
			let principalName = "Unknown"
			let principalIdNumber = ""
			let witnessName: string | null = null
			let executedAt = new Date()
			let location = "Philippines"
			let workflow: "REN" | "IEN" = "REN"

			try {
				// Get history view for audit trail
				passportData = await getPassportDocument(projectUuid, "history", user.email || undefined)
				
				// Extract signer information
				const { principal, witness } = extractSignerInfo(passportData)
				
				if (principal) {
					principalName = principal.name || "Unknown"
				}
				
				if (witness) {
					witnessName = witness.name || null
				}

				// Get execution time from passport data
				if (passportData?.data?.completed_at) {
					executedAt = new Date(passportData.data.completed_at)
				} else if (passportData?.completed_at) {
					executedAt = new Date(passportData.completed_at)
				}

				// Determine workflow (REN if has video/remote indicators, IEN otherwise)
				const passportText = JSON.stringify(passportData).toLowerCase()
				if (passportText.includes("remote") || passportText.includes("video") || passportText.includes("ren")) {
					workflow = "REN"
				} else {
					workflow = "IEN"
				}

			} catch (error) {
				console.error("Error fetching passport data:", error)
				// Continue with default values if passport fetch fails
			}

			// Get legal registration for roll number
			const legalRegistration = await ctx.db.query.legalRegistrations.findFirst({
				where: eq(legalRegistrations.applicantId, userId),
			})

			const enpName = user.name || "Unknown ENP"
			const enpRollNumber = legalRegistration?.rollOfAttorneysNumber || null

			// Generate certificate number
			const certificateNumber = `NB-${notarialBook.id.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`

			const actData = {
				notarialBookId: notarialBook.id,
				actType,
				documentId,
				docoChainProjectUuid: projectUuid,
				principalName,
				principalIdNumber,
				witnessName,
				enpName,
				enpRollNumber: enpRollNumber || undefined,
				executedAt,
				location,
				workflow,
				documentName: document.name,
				documentDescription: document.description || null,
				passportData: passportData ? JSON.stringify(passportData) : null,
				certificateNumber,
			}

			if (existingAct) {
				// Update existing act
				const [updated] = await ctx.db
					.update(notarialActs)
					.set({
						...actData,
						updatedAt: new Date(),
					})
					.where(eq(notarialActs.id, existingAct.id))
					.returning()

				return updated
			} else {
				// Create new act
				const [created] = await ctx.db
					.insert(notarialActs)
					.values(actData)
					.returning()

				return created
			}
		}),

	/**
	 * Auto-sync all completed documents for the ENP
	 * Finds all completed documents with DocoChain project UUIDs and syncs them
	 */
	autoSyncAllDocuments: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can sync documents",
			})
		}

		// Find all documents with DocoChain project UUIDs
		// Documents with docoChainProjectId have been signed/notarized via Doc On Chain
		// Documents are linked to ENPs via envelopes (envelope.userId) or meetings
		const completedDocuments = await ctx.db
			.select({
				id: documents.id,
				name: documents.name,
				description: documents.description,
				docoChainProjectId: documents.docoChainProjectId,
				envelopeId: documents.envelopeId,
				meetingId: documents.meetingId,
			})
			.from(documents)
			.where(
				// Only documents with DocoChain project UUIDs (these have been signed/notarized)
				isNotNull(documents.docoChainProjectId)
			)

		// Filter to documents where ENP is involved
		// For now, we'll sync all completed documents with DocoChain UUIDs
		// In the future, we can filter by envelope.userId or meeting participants
		const enpDocuments = completedDocuments.filter(doc => doc.docoChainProjectId)

		let syncedCount = 0
		const errors: string[] = []

		// Get or create notarial book
		let notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			const [created] = await ctx.db
				.insert(notarialBooks)
				.values({
					enpId: userId,
				})
				.returning()
			
			notarialBook = created!
		}

		// Sync each document
		for (const doc of enpDocuments) {
			if (!doc.docoChainProjectId) continue

			try {
				// Check if already synced - check by docoChainProjectUuid (primary) and documentId (secondary)
				// This prevents duplicates even if the same project UUID is processed multiple times
				const existingAct = await ctx.db.query.notarialActs.findFirst({
					where: and(
						eq(notarialActs.notarialBookId, notarialBook.id),
						eq(notarialActs.docoChainProjectUuid, doc.docoChainProjectId)
					),
				})

				if (existingAct) {
					// Already synced, skip
					continue
				}

				// Determine act type from document
				const actType = determineActType(doc.name, doc.description || null, null)

				// Fetch passport data
				let passportData: any = null
				let principalName = "Unknown"
				let witnessName: string | null = null
				let executedAt = new Date()
				let workflow: "REN" | "IEN" = "REN"

				try {
					passportData = await getPassportDocument(doc.docoChainProjectId, "history", user.email || undefined)
					const { principal, witness } = extractSignerInfo(passportData)
					
					if (principal) {
						principalName = principal.name || "Unknown"
					}
					
					if (witness) {
						witnessName = witness.name || null
					}

					if (passportData?.data?.completed_at) {
						executedAt = new Date(passportData.data.completed_at)
					} else if (passportData?.completed_at) {
						executedAt = new Date(passportData.completed_at)
					}

					const passportText = JSON.stringify(passportData).toLowerCase()
					if (passportText.includes("remote") || passportText.includes("video") || passportText.includes("ren")) {
						workflow = "REN"
					} else {
						workflow = "IEN"
					}
				} catch (error) {
					console.error(`Error fetching passport for ${doc.id}:`, error)
				}

				// Get legal registration for roll number
				const legalRegistration = await ctx.db.query.legalRegistrations.findFirst({
					where: eq(legalRegistrations.applicantId, userId),
				})

				const enpName = user.name || "Unknown ENP"
				const enpRollNumber = legalRegistration?.rollOfAttorneysNumber || null
				const certificateNumber = `NB-${notarialBook.id.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`

				// Create notarial act entry
				await ctx.db.insert(notarialActs).values({
					notarialBookId: notarialBook.id,
					actType,
					documentId: doc.id,
					docoChainProjectUuid: doc.docoChainProjectId,
					principalName,
					witnessName,
					enpName,
					enpRollNumber: enpRollNumber || undefined,
					executedAt,
					location: "Philippines",
					workflow,
					documentName: doc.name,
					documentDescription: doc.description || null,
					passportData: passportData ? JSON.stringify(passportData) : null,
					certificateNumber,
				})

				syncedCount++
			} catch (error) {
				console.error(`Error syncing document ${doc.id}:`, error)
				errors.push(`Failed to sync ${doc.name}: ${error instanceof Error ? error.message : "Unknown error"}`)
			}
		}

		return {
			success: true,
			syncedCount,
			totalDocuments: enpDocuments.length,
			errors: errors.length > 0 ? errors : undefined,
		}
	}),

	/**
	 * Get document URL for viewing/downloading
	 */
	getDocumentUrl: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access documents",
				})
			}

			// Get notarial act
			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			// Verify it belongs to this ENP's notarial book
			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this document",
				})
			}

			// If we have a documentId, get the document URL
			if (act.documentId) {
				const document = await ctx.db.query.documents.findFirst({
					where: eq(documents.id, act.documentId),
				})

				if (document?.path) {
					const supabase = getPublicClient()
					const bucketName = document.path.includes("envelopes") ? "envelopes" : "documents"
					const { data: { publicUrl } } = supabase.storage
						.from(bucketName)
						.getPublicUrl(document.path)

					return {
						url: publicUrl,
						fileName: document.name,
						type: "document",
					}
				}
			}

			// If we have a DocoChain project UUID, try to get document from DocoChain
			if (act.docoChainProjectUuid) {
				try {
					// Get passport data which may contain document URL
					const passportData = await getPassportDocument(
						act.docoChainProjectUuid,
						"blockchain",
						user.email || undefined
					)

					// Handle both string and object responses
					if (typeof passportData === "object" && passportData !== null) {
						const passportObj = passportData as Record<string, unknown>
						const documentUrl = (passportObj.data as Record<string, unknown> | undefined)?.document_url as string | undefined
							?? passportObj.document_url as string | undefined
						
						if (documentUrl) {
							return {
								url: documentUrl,
								fileName: act.documentName || "document.pdf",
								type: "document",
							}
						}
					}
				} catch (error) {
					console.error("Error fetching document from DocoChain:", error)
				}
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Document URL not available",
			})
		}),

	/**
	 * Get certificate URL for viewing/downloading
	 */
	getCertificateUrl: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access certificates",
				})
			}

			// Get notarial act
			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			// Verify it belongs to this ENP's notarial book
			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this certificate",
				})
			}

			// If we have a stored certificate URL, use it
			if (act.certificateUrl) {
				return {
					url: act.certificateUrl,
					fileName: `certificate-${act.certificateNumber || act.id}.pdf`,
					type: "certificate",
				}
			}

			// If we have a DocoChain project UUID, download certificate from DocoChain
			if (act.docoChainProjectUuid) {
				try {
					const certificate = await downloadCertificate(
						act.docoChainProjectUuid,
						user.email || undefined
					)

					// Update the act with the certificate URL for future use
					await ctx.db
						.update(notarialActs)
						.set({
							certificateUrl: certificate.url,
						})
						.where(eq(notarialActs.id, act.id))

					return {
						url: certificate.url,
						fileName: certificate.fileName,
						type: "certificate",
					}
				} catch (error) {
					console.error("Error downloading certificate from DocoChain:", error)
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to get certificate: ${error instanceof Error ? error.message : "Unknown error"}`,
					})
				}
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Certificate not available",
			})
		}),

	/**
	 * Export notarial book as PDF/PDFA for Supreme Court submission
	 */
	exportNotarialBook: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can export notarial book",
			})
		}

		// Get notarial book
		const notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notarial book not found",
			})
		}

		// Get all acts
		const acts = await ctx.db
			.select()
			.from(notarialActs)
			.where(eq(notarialActs.notarialBookId, notarialBook.id))
			.orderBy(desc(notarialActs.executedAt))

		// TODO: Generate PDF/PDFA from acts
		// For now, return the data structure
		return {
			notarialBook,
			acts,
			exportFormat: "PDF", // Will be PDFA when implemented
			generatedAt: new Date(),
		}
	}),
})

