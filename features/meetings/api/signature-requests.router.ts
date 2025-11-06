import { TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { documents } from "@/services/drizzle/schema/document"
import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { addSignerToProject, sendDocoChainProject, generateSignLink } from "@/services/docochain"

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

			// Add signer to DocoChain project and send it
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

					// Send/Deploy the project to make it active
					await sendDocoChainProject(document.docoChainProjectId)
					console.log("✅ DocoChain project sent/deployed")
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

	// Generate a signing link for a DocoChain project
	generateSigningLink: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
				email: z.string().email("Valid email is required"),
				firstName: z.string().optional(),
				lastName: z.string().optional(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { projectUuid, email, firstName, lastName } = input

			try {
				// Get user details if not provided
				const userFirstName = firstName || ctx.session.user.name?.split(" ")[0] || "User"
				const userLastName = lastName || ctx.session.user.name?.split(" ").slice(1).join(" ") || ""

				// Step 1: Add the ENP as a signer to the project (if not already added)
				console.log("🔵 Ensuring ENP is added as signer to project...")
				await addSignerToProject({
					projectUuid,
					email,
					firstName: userFirstName,
					lastName: userLastName,
					signerRole: "Signer",
				})

				// Step 2: Generate the signing link for this ENP
				console.log("🔵 Generating signing link for ENP...")
				const result = await generateSignLink({
					projectUuid,
					email,
				})

				return {
					success: true,
					link: result.link,
				}
			} catch (error) {
				console.error("❌ Failed to generate signing link:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to generate signing link",
				})
			}
		}),
})

