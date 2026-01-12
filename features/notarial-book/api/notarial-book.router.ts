import { TRPCError } from "@trpc/server"
import { and, count, desc, eq, isNotNull } from "drizzle-orm"
import { z } from "zod/v4"

import { checkSigningStatus, downloadCertificate, getPassportDocument } from "@/services/docochain"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { meetings } from "@/services/drizzle/schema/meetings"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { autoCreateNotarialAct } from "@/features/notarial-book/lib/auto-create-notarial-act"

const getNotarialBookSchema = z.object({
	page: z.number().min(1).default(1),
	perPage: z.number().min(1).max(100).default(50),
	search: z.string().optional(),
	actType: z
		.enum(["ALL", "ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"])
		.default("ALL"),
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
function extractSignerInfo(passportData: unknown) {
	const signers: Array<{
		name: string
		email: string
		role: string
		signedAt?: string
		idNumber?: string
	}> = []

	if (!passportData || typeof passportData !== "object") {
		return { principal: undefined, witness: undefined, allSigners: signers }
	}

	const passportObj = passportData as { 
		data?: { 
			signers?: Array<unknown>
			history?: Array<unknown>
		}
		signers?: Array<unknown>
		history?: Array<unknown>
	}

	// Try different possible structures from DocoChain Passport API
	if (passportObj.data?.signers && Array.isArray(passportObj.data.signers)) {
		for (const signer of passportObj.data.signers) {
			if (signer && typeof signer === "object") {
				const s = signer as { name?: unknown; email?: unknown; role?: unknown; signedAt?: unknown; idNumber?: unknown }
				if (typeof s.name === "string" && typeof s.email === "string" && typeof s.role === "string") {
					signers.push({
						name: s.name,
						email: s.email,
						role: s.role,
						signedAt: typeof s.signedAt === "string" ? s.signedAt : undefined,
						idNumber: typeof s.idNumber === "string" ? s.idNumber : undefined,
					})
				}
			}
		}
	} else if (passportObj.signers && Array.isArray(passportObj.signers)) {
		for (const signer of passportObj.signers) {
			if (signer && typeof signer === "object") {
				const s = signer as { name?: unknown; email?: unknown; role?: unknown; signedAt?: unknown; idNumber?: unknown }
				if (typeof s.name === "string" && typeof s.email === "string" && typeof s.role === "string") {
					signers.push({
						name: s.name,
						email: s.email,
						role: s.role,
						signedAt: typeof s.signedAt === "string" ? s.signedAt : undefined,
						idNumber: typeof s.idNumber === "string" ? s.idNumber : undefined,
					})
				}
			}
		}
	} else if (passportObj.data?.history || passportObj.history) {
		// Extract from history/audit trail
		const history = Array.isArray(passportObj.data?.history) 
			? passportObj.data.history 
			: Array.isArray(passportObj.history) 
				? passportObj.history 
				: []
		
		for (const event of history) {
			if (event && typeof event === "object" && "signer" in event) {
				const evt = event as { signer?: unknown; timestamp?: unknown; signed_at?: unknown }
				const signer = evt.signer
				if (signer && typeof signer === "object") {
					const sig = signer as { 
						name?: unknown
						first_name?: unknown
						last_name?: unknown
						email?: unknown
						role?: unknown
						signer_role?: unknown
					}
					const name = typeof sig.name === "string" 
						? sig.name 
						: (typeof sig.first_name === "string" && typeof sig.last_name === "string")
							? `${sig.first_name} ${sig.last_name}`.trim()
							: "Unknown"
					const email = typeof sig.email === "string" ? sig.email : ""
					const role = typeof sig.role === "string" 
						? sig.role 
						: typeof sig.signer_role === "string" 
							? sig.signer_role 
							: "SIGNER"
					const signedAt = typeof evt.timestamp === "string" 
						? evt.timestamp 
						: typeof evt.signed_at === "string" 
							? evt.signed_at 
							: undefined
					
					if (name && email) {
						signers.push({
							name,
							email,
							role,
							signedAt,
						})
					}
				}
			}
		}
	}

	// Identify principal (usually first signer or role "PRINCIPAL")
	const principal = signers.find(s => 
		s.role?.toUpperCase().includes("PRINCIPAL") || 
		s.role?.toUpperCase().includes("SIGNER")
	) ?? signers[0]

	// Identify witness (role "WITNESS")
	const witness = signers.find(s => s.role?.toUpperCase().includes("WITNESS"))

	return { principal, witness, allSigners: signers }
}

export const notarialBookRouter = createTRPCRouter({
	/**
	 * Get notarial book entries for the current ENP
	 * Uses Doc On Chain Passport API to fetch document history
	 */
	getNotarialBook: protectedProcedure.input(getNotarialBookSchema).query(async ({ ctx, input }) => {
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
					(act.documentName?.toLowerCase().includes(searchLower) ?? false) ||
					(act.certificateNumber?.toLowerCase().includes(searchLower) ?? false)
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

			// Identify the principal (document uploader)
			// The principal is the person who uploaded the document, typically a non-ENP participant in the meeting
			let principalName = "Unknown"
			let principalIdNumber = ""

			// If document is linked to a meeting, try to find the principal from meeting participants
			if (document.meetingId) {
				try {
					const meeting = await ctx.db.query.meetings.findFirst({
						where: eq(meetings.id, document.meetingId),
						with: {
							participants: {
								with: {
									user: {
										columns: {
											id: true,
											name: true,
											email: true,
											role: true,
										},
									},
								},
							},
						},
					})

					if (meeting?.participants) {
						// Find the participant who is NOT the ENP (the principal/uploader)
						const principalParticipant = meeting.participants.find(
							p => p.user.id !== userId && p.user.role !== "ENP"
						)

						if (principalParticipant?.user) {
							principalName = principalParticipant.user.name ?? principalParticipant.user.email ?? "Unknown"
							console.log("✅ Found principal from meeting participants:", principalName)
						}
					}
				} catch (error) {
					console.warn("Failed to get meeting participants for principal identification:", error)
				}
			}

			// Fetch passport data from Doc On Chain
			let passportData: unknown = null
			let witnessName: string | null = null
			let executedAt = new Date()
			const location = "Philippines"
			let workflow: "REN" | "IEN" = "REN"

			try {
				// Get history view for audit trail
				passportData = await getPassportDocument(projectUuid, "history", user.email ?? undefined)
				
				// Extract signer information for witness and additional principal details
				const { principal, witness } = extractSignerInfo(passportData)
				
				// Only use passport data for principal if we didn't find one from meeting participants
				// This ensures the uploader (from meeting) takes precedence
				if (principalName === "Unknown" && principal) {
					principalName = principal.name ?? "Unknown"
					principalIdNumber = principal.idNumber ?? ""
				} else if (principal) {
					// If we already have principal name, still try to get ID from passport
					if (!principalIdNumber && principal.idNumber) {
						principalIdNumber = principal.idNumber
					}
				}

				if (witness) {
					witnessName = witness.name ?? null
				}

				// Get execution time from passport data
				if (passportData && typeof passportData === "object") {
					const passportObj = passportData as { 
						data?: { completed_at?: unknown }
						completed_at?: unknown
					}
					if (passportObj.data?.completed_at) {
						const completedAt = passportObj.data.completed_at
						if (typeof completedAt === "string" || typeof completedAt === "number" || completedAt instanceof Date) {
							executedAt = new Date(completedAt)
						}
					} else if (passportObj.completed_at) {
						const completedAt = passportObj.completed_at
						if (typeof completedAt === "string" || typeof completedAt === "number" || completedAt instanceof Date) {
							executedAt = new Date(completedAt)
						}
					}
				}

				// Determine workflow (REN if has video/remote indicators, IEN otherwise)
				const passportText = JSON.stringify(passportData).toLowerCase()
				if (
					passportText.includes("remote") ||
					passportText.includes("video") ||
					passportText.includes("ren")
				) {
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

			const enpName = user.name ?? "Unknown ENP"
			const enpRollNumber = legalRegistration?.rollOfAttorneysNumber ?? null

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
				enpRollNumber: enpRollNumber ?? undefined,
				executedAt,
				location,
				workflow,
				documentName: document.name,
				documentDescription: document.description ?? null,
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
				const [created] = await ctx.db.insert(notarialActs).values(actData).returning()

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

		// Sync each document using autoCreateNotarialAct for consistency
		// IMPORTANT: Only sync documents that are FULLY SIGNED
		for (const doc of enpDocuments) {
			if (!doc.docoChainProjectId) continue

			try {
				// First, verify the document is fully signed before syncing
				// This ensures only fully signed documents appear in the Notarial Book
				try {
					const signingStatus = await checkSigningStatus(doc.docoChainProjectId, user.email ?? undefined)
					
					if (!signingStatus.isFullySigned) {
						console.log(`⏭️ Skipping ${doc.name} - not fully signed yet (${signingStatus.signedCount}/${signingStatus.totalSigners} signers)`)
						// Don't add to errors - this is expected behavior
						continue
					}
					
					console.log(`✅ Document ${doc.name} is fully signed, proceeding to sync...`)
				} catch (statusError) {
					const errorMessage = statusError instanceof Error ? statusError.message : String(statusError)
					
					// If it's "not fully signed" error, skip silently
					if (errorMessage.includes("not fully signed") || errorMessage.includes("not fully signed yet")) {
						console.log(`⏭️ Skipping ${doc.name} - not fully signed yet`)
						continue
					}
					
					// For other errors (API issues), log but try to sync anyway
					// autoCreateNotarialAct will also check signing status as a safeguard
					console.warn(`⚠️ Could not verify signing status for ${doc.name}, but continuing (might be temporary API issue):`, errorMessage)
				}

				// Use autoCreateNotarialAct which handles principal identification from meeting participants
				// and all other logic consistently (it also checks signing status internally as a safeguard)
				const createdAct = await autoCreateNotarialAct(
					ctx.db,
					doc.id,
					doc.docoChainProjectId,
					userId,
					user.email ?? undefined
				)

				if (createdAct) {
					syncedCount++
				} else {
					// Act already exists or creation failed (already logged in autoCreateNotarialAct)
					// Check if it already exists to provide better feedback
					const existingAct = await ctx.db.query.notarialActs.findFirst({
						where: and(
							eq(notarialActs.notarialBookId, notarialBook.id),
							eq(notarialActs.docoChainProjectUuid, doc.docoChainProjectId)
						),
					})

					if (existingAct) {
						// Already synced, skip silently
						continue
					} else {
						// Creation failed for another reason (likely not fully signed, which is expected)
						// Don't add to errors - this is handled gracefully
						console.log(`⏭️ Could not create notarial act for ${doc.name} (document may not be fully signed)`)
					}
				}
			} catch (error) {
				console.error(`Error syncing document ${doc.id}:`, error)
				errors.push(
					`Failed to sync ${doc.name}: ${error instanceof Error ? error.message : "Unknown error"}`
				)
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

			// Use proxy endpoint to serve the document with proper authentication
			// This ensures the PDF is fetched with backend authentication and served to the frontend
			// The proxy endpoint handles all the complexity of fetching from DocoChain Vault/APIs
			if (act.documentId || act.docoChainProjectUuid) {
				// Return proxy URL that will handle fetching from DocoChain with authentication
				const proxyUrl = `/api/notarial-book/documents/${act.id}`
				console.log("✅ Using proxy endpoint for document:", proxyUrl)
				return {
					url: proxyUrl,
					fileName: act.documentName ?? "document.pdf",
					type: "document",
				}
			}



			// If we reach here, neither DocoChain nor Supabase had the document
			let errorMessage = "Document URL not available."
			
			if (act.docoChainProjectUuid) {
				errorMessage += " The document may not have been fully signed in DocoChain, or the project may have been deleted."
			} else if (act.documentId) {
				errorMessage += " The document file may not have been uploaded to storage."
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: errorMessage,
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
					fileName: `certificate-${act.certificateNumber ?? act.id}.pdf`,
					type: "certificate",
				}
			}

			// If we have a DocoChain project UUID, download certificate from DocoChain
			if (act.docoChainProjectUuid) {
				try {
					const certificate = await downloadCertificate(
						act.docoChainProjectUuid,
						user.email ?? undefined
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
		// Data is stored chronologically via executedAt timestamp
		// For export, we use ASC order to export in chronological sequence (oldest to newest)
		const acts = await ctx.db
			.select()
			.from(notarialActs)
			.where(eq(notarialActs.notarialBookId, notarialBook.id))
			.orderBy(notarialActs.executedAt) // Export: chronological order (oldest to newest)

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
