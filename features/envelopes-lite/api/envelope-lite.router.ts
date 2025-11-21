import { desc, eq } from "drizzle-orm"
import { z } from "zod/v4"

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
		.input(z.object({ documentId: z.string(), envelopeId: z.string() }))
		.query(async ({ ctx, input }) => {
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
})
