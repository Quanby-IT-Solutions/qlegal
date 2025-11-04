import { TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { documents } from "@/services/drizzle/schema/document"
import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { addSignerToProject, generateSignLink } from "@/services/docochain"

export const signatureRequestsRouter = createTRPCRouter({
	// Create a signature request
	createRequest: protectedProcedure
		.input(
			z.object({
				meetingId: z.string(),
				documentId: z.string(),
				signerId: z.string(), // ENP user who needs to sign
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { meetingId, documentId, signerId } = input

			// Get the document to check for DocoChain project ID
			const document = await db.query.documents.findFirst({
				where: eq(documents.id, documentId),
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// Get the signer user details using Drizzle
			const signerUser = await db.query.users.findFirst({
				where: eq(users.id, signerId),
				columns: {
					id: true,
					name: true,
					email: true,
				},
			})

			if (!signerUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signer user not found",
				})
			}

			// Add signer to DocoChain project (keep as DRAFT so ENP can place signature fields)
			if (document.docoChainProjectId) {
				try {
					const nameParts = (signerUser.name || "").split(" ")
					const firstName = nameParts[0] || "Signer"
					const lastName = nameParts.slice(1).join(" ") || "User"

					await addSignerToProject({
						projectUuid: document.docoChainProjectId,
						email: signerUser.email || "",
						firstName,
						lastName,
						signerRole: "Signer",
					})

					console.log("✅ Added signer to DocoChain project")
					console.log("📝 Project kept as DRAFT - ENP can place signature fields themselves")

					// NOTE: We DON'T add signature fields or deploy the project here
					// The project stays as DRAFT so the ENP can:
					// 1. Open the DocoChain project in DRAFT mode
					// 2. Use the "SIGNATURE" button to drag and place signature fields
					// 3. Click on the field to create their signature
					// 4. Click "SIGN NOW" when ready (DocoChain auto-deploys after signing)
				} catch (docoChainError) {
					console.error("❌ Failed to add signer to DocoChain:", docoChainError)
					// Continue anyway - user can still be notified
				}
			} else {
				console.warn("⚠️ No DocoChain project ID for document:", documentId)
			}

			// Create signature request in our database
			const [request] = await db
				.insert(signatureRequests)
				.values({
					meetingId,
					documentId,
					requesterId: ctx.session.user.id, // Principal who is requesting
					signerId,
					status: "PENDING",
				})
				.returning()

			return {
				success: true,
				request,
			}
		}),

	// Get pending signature requests for current user
	getPendingRequests: protectedProcedure
		.input(z.object({ meetingId: z.string() }).optional())
		.query(async ({ ctx, input }) => {
			const where = input?.meetingId
				? and(
						eq(signatureRequests.signerId, ctx.session.user.id),
						eq(signatureRequests.status, "PENDING"),
						eq(signatureRequests.meetingId, input.meetingId)
				  )
				: and(eq(signatureRequests.signerId, ctx.session.user.id), eq(signatureRequests.status, "PENDING"))

			const requests = await db.query.signatureRequests.findMany({
				where,
				with: {
					document: true,
					requester: {
						columns: {
							id: true,
							name: true,
							email: true,
						},
					},
					meeting: {
						columns: {
							id: true,
							title: true,
						},
					},
				},
				orderBy: (signatureRequests, { desc }) => [desc(signatureRequests.createdAt)],
			})

			return requests
		}),

	// Update signature request status
	updateStatus: protectedProcedure
		.input(
			z.object({
				requestId: z.string(),
				status: z.enum(["SIGNED", "DECLINED"]),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { requestId, status } = input

			// Verify the request belongs to the current user
			const request = await db.query.signatureRequests.findFirst({
				where: eq(signatureRequests.id, requestId),
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signature request not found",
				})
			}

			if (request.signerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this request",
				})
			}

			// Update status
			const [updatedRequest] = await db
				.update(signatureRequests)
				.set({
					status,
					signedAt: status === "SIGNED" ? new Date() : null,
					updatedAt: new Date(),
				})
				.where(eq(signatureRequests.id, requestId))
				.returning()

			return {
				success: true,
				request: updatedRequest,
			}
		}),

	// Generate a personalized signing link for the ENP user
	generateSigningLink: protectedProcedure
		.input(
			z.object({
				requestId: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { requestId } = input

			// Get the signature request with document details
			const request = await db.query.signatureRequests.findFirst({
				where: eq(signatureRequests.id, requestId),
				with: {
					document: true,
				},
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signature request not found",
				})
			}

			// Verify the user is the signer
			if (request.signerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to access this signing link",
				})
			}

			// Check if document has DocoChain project ID
			if (!request.document.docoChainProjectId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document does not have a DocoChain project associated with it",
				})
			}

			// Get current user's email
			const userEmail = ctx.session.user.email
			if (!userEmail) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User email not found",
				})
			}

			try {
				// Generate the personalized signing link for ENP
				const signingLink = await generateSignLink({
					projectUuid: request.document.docoChainProjectId,
					email: userEmail,
				})

				return {
					success: true,
					signingLink,
				}
			} catch (error) {
				console.error("❌ Failed to generate signing link:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate signing link. Please try again.",
				})
			}
		}),
})

