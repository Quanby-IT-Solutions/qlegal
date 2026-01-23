import { desc, eq } from "drizzle-orm"
import { z } from "zod/v4"

import {
	checkSigningStatus,
	downloadCertificate,
	downloadSignedDocument,
	getProcessingCompletedProjects,
	getProjectDetails,
} from "@/services/doconchain"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { createEnvelopeSchema } from "./envelope-lite-schema"

const searchUsersSchema = z.object({
	query: z.string().min(1, "Search query is required"),
})

const getByIdSchema = z.object({ envelopeId: z.string().min(1) })

const createDocumentsSchema = z.object({
	envelopeId: z.string().min(1),
	files: z.array(
		z.object({
			name: z.string(),
			type: z.string(),
			size: z.number(),
			path: z.string(),
		})
	),
})

export const envelopeLiteRouter = createTRPCRouter({
	createEnvelope: protectedProcedure
		.input(createEnvelopeSchema)
		.mutation(async ({ ctx, input }) => {
			// Create envelope in database
			const [envelope] = await ctx.db
				.insert(envelopes)
				.values({
					title: input.title,
					description: input.description ?? null,
					status: "DRAFT",
					userId: ctx.session.user.id,
				})
				.returning()

			return envelope
		}),

	getEnvelopeById: protectedProcedure.input(getByIdSchema).query(async ({ ctx, input }) => {
		// Get envelope from database
		const [envelope] = await ctx.db
			.select({
				id: envelopes.id,
				title: envelopes.title,
				description: envelopes.description,
				status: envelopes.status,
				createdAt: envelopes.createdAt,
				updatedAt: envelopes.updatedAt,
				userId: envelopes.userId,
				user: {
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
				},
			})
			.from(envelopes)
			.leftJoin(users, eq(envelopes.userId, users.id))
			.where(eq(envelopes.id, input.envelopeId))
			.limit(1)

		if (!envelope) {
			throw new Error("Envelope not found")
		}

		return envelope
	}),

	getMyEnvelopes: protectedProcedure.query(async ({ ctx }) => {
		// Get all envelopes for the current user from database
		const userEnvelopes = await ctx.db
			.select({
				id: envelopes.id,
				title: envelopes.title,
				description: envelopes.description,
				status: envelopes.status,
				createdAt: envelopes.createdAt,
				updatedAt: envelopes.updatedAt,
				userId: envelopes.userId,
				user: {
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
				},
			})
			.from(envelopes)
			.leftJoin(users, eq(envelopes.userId, users.id))
			.where(eq(envelopes.userId, ctx.session.user.id))
			.orderBy(desc(envelopes.updatedAt))

		return userEnvelopes
	}),

	searchUsers: protectedProcedure.input(searchUsersSchema).query(async () => {
		// For now, return empty array until database is properly set up
		const mockUsers: Array<{
			id: string
			name: string | null
			email: string | null
			image: string | null
		}> = []
		return mockUsers
	}),

	// Document management
	createDocuments: protectedProcedure
		.input(createDocumentsSchema)
		.mutation(async ({ ctx, input }) => {
			// Create documents in database
			const createdDocuments = await ctx.db
				.insert(documents)
				.values(
					input.files.map(file => ({
						name: file.name,
						type: file.type,
						size: file.size,
						path: file.path,
						envelopeId: input.envelopeId,
					}))
				)
				.returning()

			return createdDocuments
		}),

	getEnvelopeDocuments: protectedProcedure.input(getByIdSchema).query(async ({ ctx, input }) => {
		// Get envelope to check status
		const [envelope] = await ctx.db
			.select({
				id: envelopes.id,
				status: envelopes.status,
			})
			.from(envelopes)
			.where(eq(envelopes.id, input.envelopeId))
			.limit(1)

		// Get all documents for an envelope with recipients
		const envelopeDocuments = await ctx.db
			.select({
				id: documents.id,
				name: documents.name,
				type: documents.type,
				size: documents.size,
				path: documents.path,
				status: documents.status,
				docoChainProjectId: documents.docoChainProjectId,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
				envelopeId: documents.envelopeId,
			})
			.from(documents)
			.where(eq(documents.envelopeId, input.envelopeId))
			.orderBy(desc(documents.createdAt))

		// For now, return documents with empty recipients array
		// TODO: Add proper recipient relationships when schema is updated
		return envelopeDocuments.map(doc => ({
			...doc,
			recipients: [],
			envelopeStatus: envelope?.status ?? "DRAFT",
		}))
	}),

	// Placeholder procedures for the disclosure component
	getPendingRecipientRequests: protectedProcedure.input(getByIdSchema).query(async () => {
		// TODO: Implement when recipient request system is added
		return []
	}),

	acceptRecipientRequest: protectedProcedure
		.input(z.object({ recipientId: z.string() }))
		.mutation(async () => {
			// TODO: Implement when recipient request system is added
			throw new Error("Not implemented yet")
		}),

	declineRecipientRequest: protectedProcedure
		.input(z.object({ recipientId: z.string() }))
		.mutation(async () => {
			// TODO: Implement when recipient request system is added
			throw new Error("Not implemented yet")
		}),

	deleteDocument: protectedProcedure
		.input(z.object({ documentId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Delete document from database
			await ctx.db.delete(documents).where(eq(documents.id, input.documentId))
			return { success: true }
		}),

	getDocumentForViewing: protectedProcedure
		.input(
			z.object({
				documentId: z.string(),
				envelopeId: z.string().optional(),
				projectUuid: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			// Handle DocoChain projects (when projectUuid is provided)
			if (input.projectUuid && !input.envelopeId) {
				try {
					const userEmail = ctx.session.user.email
					const projectDetails = await getProjectDetails(input.projectUuid, userEmail || undefined)
					const projectData = projectDetails?.data

					if (!projectData) {
						throw new Error("DocoChain project not found")
					}

					// Get the signed document URL from project data
					const signedDocumentUrl = projectData.url

					if (!signedDocumentUrl) {
						throw new Error(
							"Signed document URL not available. Document may not be fully signed yet."
						)
					}

					return {
						id: input.documentId,
						name: (projectData.file_name ?? projectData.name ?? "Signed Document") as string,
						url: signedDocumentUrl as string,
					}
				} catch (error) {
					throw new Error(
						error instanceof Error ? error.message : "Failed to load DocoChain document"
					)
				}
			}

			// Handle regular documents (when envelopeId is provided)
			if (!input.envelopeId) {
				throw new Error("Either envelopeId or projectUuid is required")
			}

			// Get document for viewing
			const [document] = await ctx.db
				.select()
				.from(documents)
				.where(eq(documents.id, input.documentId))
				.limit(1)

			if (!document) {
				throw new Error("Document not found")
			}

			// TODO: Generate proper document URL from storage
			return {
				...document,
				url: `#mock-url-for-${document.id}`,
			}
		}),

	getPendingDocuments: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Get documents from envelopes that are in pending states
		// Pending states: PUBLISHED, PENDING_APPROVAL, IN_PROGRESS, PENDING
		// Documents should belong to envelopes owned by the user
		const pendingStatuses = ["PUBLISHED", "PENDING_APPROVAL", "IN_PROGRESS", "PENDING"]

		const pendingDocuments = await ctx.db
			.select({
				id: documents.id,
				name: documents.name,
				type: documents.type,
				size: documents.size,
				path: documents.path,
				status: documents.status,
				docoChainProjectId: documents.docoChainProjectId,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
				envelopeId: documents.envelopeId,
				envelope: {
					id: envelopes.id,
					title: envelopes.title,
					description: envelopes.description,
					status: envelopes.status,
					userId: envelopes.userId,
					createdAt: envelopes.createdAt,
					updatedAt: envelopes.updatedAt,
				},
				envelopeOwner: {
					id: users.id,
					name: users.name,
					email: users.email,
					image: users.image,
				},
			})
			.from(documents)
			.innerJoin(envelopes, eq(documents.envelopeId, envelopes.id))
			.leftJoin(users, eq(envelopes.userId, users.id))
			.where(
				// User owns the envelope AND envelope is in a pending state
				eq(envelopes.userId, userId)
			)
			.orderBy(desc(documents.updatedAt))

		// Filter to only include documents from envelopes with pending statuses
		const filtered = pendingDocuments.filter(
			doc => doc.envelope && pendingStatuses.includes(doc.envelope.status)
		)

		return filtered.map(doc => ({
			id: doc.id,
			name: doc.name,
			type: doc.type,
			size: doc.size,
			path: doc.path,
			status: doc.status,
			docoChainProjectId: doc.docoChainProjectId,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			envelopeId: doc.envelopeId,
			envelope: doc.envelope
				? {
						id: doc.envelope.id,
						title: doc.envelope.title,
						description: doc.envelope.description,
						status: doc.envelope.status,
						userId: doc.envelope.userId,
						createdAt: doc.envelope.createdAt,
						updatedAt: doc.envelope.updatedAt,
					}
				: null,
			envelopeOwner: doc.envelopeOwner
				? {
						id: doc.envelopeOwner.id,
						name: doc.envelopeOwner.name,
						email: doc.envelopeOwner.email,
						image: doc.envelopeOwner.image,
					}
				: null,
		}))
	}),

	getCompletedDocuments: protectedProcedure
		.input(
			z.object({
				page: z.number().min(1).default(1).optional(),
				limit: z.number().min(1).max(100).default(20).optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userEmail = ctx.session.user.email

			if (!userEmail) {
				return {
					documents: [],
					total: 0,
					page: input.page ?? 1,
					limit: input.limit ?? 20,
					hasMore: false,
				}
			}

			const page = input.page ?? 1
			const limit = input.limit ?? 20

			// Fetch completed projects from DocoChain processing-completed API
			let completedProjects: Array<{
				id: number
				uuid: string
				name: string
				status: string
				created_at: string
				updated_at: string
				project_uuid?: string
			}> = []

			let totalCount = 0

			try {
				const response = await getProcessingCompletedProjects(userEmail, {
					perPage: limit,
					page,
					status: "completed", // Only get completed projects
					email: userEmail, // Filter by user email
					userItemsOnly: false,
					apiIntegratedProjectsOnly: true, // Only get API-integrated projects
					getProjectsByOrganization: false,
				})

				completedProjects = response.data || []
				// Get total count from metadata if available
				totalCount = response.meta?.total ?? completedProjects.length
			} catch (error) {
				// Log error but don't fail the entire query
				console.error("Failed to fetch DocoChain completed projects:", error)
				return {
					documents: [],
					total: 0,
					page,
					limit,
					hasMore: false,
				}
			}

			// Transform completed projects to document-like structure
			const completedDocuments = completedProjects.map(project => ({
				id: `project-${project.uuid}`, // Unique ID for projects
				name: project.name || "Untitled Document",
				type: "application/pdf", // Default type for projects
				size: 0, // Size not available from API
				path: "", // No local path for projects
				status: "SIGNED" as const,
				docoChainProjectId: project.project_uuid ?? project.uuid,
				createdAt: new Date(project.created_at),
				updatedAt: new Date(project.updated_at || project.created_at),
				envelopeId: null, // No local envelope for projects
				envelope: null,
				envelopeOwner: null,
				// Project-specific metadata
				projectId: project.id,
				projectUuid: project.uuid,
				projectCreatedAt: project.created_at,
				isVaultOnly: true, // Flag to indicate this is from DocoChain API
			}))

			// Sort by updatedAt (most recent first)
			const sortedDocuments = completedDocuments.sort((a, b) => {
				const dateA = new Date(a.updatedAt).getTime()
				const dateB = new Date(b.updatedAt).getTime()
				return dateB - dateA
			})

			// Calculate if there are more pages
			const hasMore = page * limit < totalCount

			return {
				documents: sortedDocuments,
				total: totalCount,
				page,
				limit,
				hasMore,
			}
		}),

	// Download the signed document from DocoChain
	downloadSignedDocument: protectedProcedure
		.input(z.object({ projectUuid: z.string().min(1, "Project UUID is required") }))
		.query(async ({ input, ctx }) => {
			try {
				const userEmail = ctx.session.user.email

				if (!userEmail) {
					throw new Error("User email is required")
				}

				// First check if document is fully signed
				const status = await checkSigningStatus(input.projectUuid, userEmail)

				if (!status.isFullySigned) {
					throw new Error(
						`Document is not fully signed yet. Status: ${status.projectStatus}, Signed: ${status.signedCount}/${status.totalSigners}`
					)
				}

				// Download the signed document
				const { buffer, fileName, url } = await downloadSignedDocument(input.projectUuid, userEmail)

				// Convert buffer to base64 for transmission
				const base64 = buffer.toString("base64")

				return {
					success: true,
					fileName,
					documentUrl: url,
					base64,
					size: buffer.length,
				}
			} catch (error) {
				console.error("❌ Error downloading signed document:", error)
				throw new Error(
					error instanceof Error ? error.message : "Failed to download signed document"
				)
			}
		}),

	// Get certificate for viewing (returns URL)
	getCertificateForViewing: protectedProcedure
		.input(z.object({ projectUuid: z.string().min(1, "Project UUID is required") }))
		.query(async ({ input, ctx }) => {
			try {
				const userEmail = ctx.session.user.email

				if (!userEmail) {
					throw new Error("User email is required")
				}

				// First check if document is fully signed
				const status = await checkSigningStatus(input.projectUuid, userEmail)

				if (!status.isFullySigned) {
					throw new Error(
						`Document is not fully signed yet. Status: ${status.projectStatus}, Signed: ${status.signedCount}/${status.totalSigners}`
					)
				}

				// Get project details to find certificate URL
				const projectDetails = await getProjectDetails(input.projectUuid, userEmail)
				const projectData = projectDetails?.data

				if (!projectData) {
					throw new Error("DocoChain project not found")
				}

				// Try to get certificate URL from project data
				let certificateUrl =
					projectData.certificate_url ?? projectData.certificateUrl ?? projectData.cert_url

				// If not in project data, download certificate to get URL
				if (!certificateUrl) {
					const certificateData = await downloadCertificate(input.projectUuid, userEmail)
					certificateUrl = certificateData.url
				}

				if (!certificateUrl) {
					throw new Error("Certificate URL not available. Certificate may not be ready yet.")
				}

				return {
					id: input.projectUuid,
					name: `${String(projectData.file_name ?? projectData.name ?? "Certificate")}_certificate.pdf`,
					url: certificateUrl as string,
				}
			} catch (error) {
				console.error("❌ Error getting certificate for viewing:", error)
				throw new Error(error instanceof Error ? error.message : "Failed to load certificate")
			}
		}),

	// Download the certificate of completion from DocoChain
	downloadCertificate: protectedProcedure
		.input(z.object({ projectUuid: z.string().min(1, "Project UUID is required") }))
		.query(async ({ input, ctx }) => {
			try {
				const userEmail = ctx.session.user.email

				if (!userEmail) {
					throw new Error("User email is required")
				}

				// First check if document is fully signed
				const status = await checkSigningStatus(input.projectUuid, userEmail)

				if (!status.isFullySigned) {
					throw new Error(
						`Document is not fully signed yet. Status: ${status.projectStatus}, Signed: ${status.signedCount}/${status.totalSigners}`
					)
				}

				// Download the certificate
				const { buffer, fileName, url } = await downloadCertificate(input.projectUuid, userEmail)

				// Convert buffer to base64 for transmission
				const base64 = buffer.toString("base64")

				return {
					success: true,
					fileName,
					certificateUrl: url,
					base64,
					size: buffer.length,
				}
			} catch (error) {
				console.error("❌ Error downloading certificate:", error)
				throw new Error(error instanceof Error ? error.message : "Failed to download certificate")
			}
		}),
})
