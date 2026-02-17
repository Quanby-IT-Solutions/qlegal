import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod/v4"

import { env } from "@/env"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { invalidateDoconchainToken } from "@/services/doconchain/auth/generate-token"
import { generateDoconchainEditDraftProjectLink } from "@/services/doconchain/projects/generate-edit-draft-link"
import { generateDoconchainSignLink } from "@/services/doconchain/projects/generate-sign-link"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

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
				with: {
					meeting: {
						with: {
							participants: {
								with: {
									user: {
										columns: {
											email: true,
											role: true,
										},
									},
								},
							},
							createdBy: {
								columns: {
									email: true,
									role: true,
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
				: and(
						eq(signatureRequests.signerId, ctx.session.user.id),
						eq(signatureRequests.status, "PENDING")
					)

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

	// Initiate signing (temporarily disabled)
	initiateSigning: protectedProcedure
		.input(
			z
				.object({
					projectUuid: z.string().optional(),
					documentId: z.string().optional(),
					email: z.string().email("Valid email is required"),
					isPlotting: z.boolean().optional(),
				})
				.refine(data => !!(data.projectUuid ?? data.documentId), {
					message: "Either projectUuid or documentId must be provided",
				})
		)
		.mutation(async ({ input }) => {
			const projectUuidFromInput = input.projectUuid?.trim()
			const documentId = input.documentId?.trim()

			let projectUuid = projectUuidFromInput
			let docRedirectUrl: string | null | undefined = null

			if (!projectUuid && documentId) {
				const doc = await db.query.documents.findFirst({
					where: eq(documents.id, documentId),
					columns: { docoChainProjectId: true, docoChainRedirectUrl: true },
				})
				projectUuid = doc?.docoChainProjectId ?? undefined
				docRedirectUrl = doc?.docoChainRedirectUrl
			}

			if (!projectUuid) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "DocOnChain project UUID is required to initiate signing",
				})
			}

			const email = input.email.trim().toLowerCase()
			const appUrl = env.DOCONCHAIN_APP_URL
			if (!docRedirectUrl && !appUrl) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"Missing DOCONCHAIN_APP_URL and no stored redirect URL is available for this document.",
				})
			}

			const doBuildLink = async () => {
				// Plot Signature uses "Edit Draft" link endpoint (portal parity).
				if (input.isPlotting === true) {
					const link = await generateDoconchainEditDraftProjectLink({
						projectUuid,
						userEmail: email,
					})
					const cleanPlotUrl = (() => {
						try {
							const url = new URL(link)
							url.searchParams.delete("token")
							return url.toString()
						} catch {
							return undefined
						}
					})()
					return { link, cleanPlotUrl }
				}

				// Sign Document uses DocOnChain's official sign-link generator (order-aware).
				const link = await generateDoconchainSignLink({ projectUuid, signerEmail: email })
				return { link, cleanPlotUrl: undefined }
			}

			try {
				const { link, cleanPlotUrl } = await doBuildLink()
				return {
					projectUuid,
					link,
					kind: input.isPlotting ? ("plot" as const) : ("sign" as const),
					cleanPlotUrl,
				}
			} catch (error) {
				// If token was invalid, invalidate and retry once.
				const msg = error instanceof Error ? error.message.toLowerCase() : ""
				if (msg.includes("401") || msg.includes("unauthorized")) {
					const invalidate = invalidateDoconchainToken as (email: string) => void
					invalidate(email)
					const { link, cleanPlotUrl } = await doBuildLink()
					return {
						projectUuid,
						link,
						kind: input.isPlotting ? ("plot" as const) : ("sign" as const),
						cleanPlotUrl,
					}
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to initiate signing",
				})
			}
		}),

	// Generate a signing link for a DocoChain project (legacy - kept for compatibility)
	generateSigningLink: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
				email: z.string().email("Valid email is required"),
				firstName: z.string().optional(),
				lastName: z.string().optional(),
			})
		)
		.mutation(async ({ input }) => {
			const projectUuid = input.projectUuid.trim()
			const email = input.email.trim().toLowerCase()

			try {
				const link = await generateDoconchainSignLink({ projectUuid, signerEmail: email })
				return { projectUuid, link, kind: "sign" as const }
			} catch (error) {
				const msg = error instanceof Error ? error.message.toLowerCase() : ""
				if (msg.includes("401") || msg.includes("unauthorized")) {
					const invalidate = invalidateDoconchainToken as (email: string) => void
					invalidate(email)
					const link = await generateDoconchainSignLink({ projectUuid, signerEmail: email })
					return { projectUuid, link, kind: "sign" as const }
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to generate signing link",
				})
			}
		}),

	// Check if current user is a signer in a DocoChain project
	isSignerInProject: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
			})
		)
		.query(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Signer checks are temporarily unavailable while we rebuild the signing integration.",
			})
		}),

	// Check if a document is fully signed
	checkSigningStatus: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
			})
		)
		.query(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Signing status checks are temporarily unavailable while we rebuild the signing integration.",
			})
		}),

	// Download the signed document from DocoChain
	downloadSignedDocument: protectedProcedure
		.input(z.string().min(1, "Project UUID is required"))
		.query(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Signed document download is temporarily unavailable while we rebuild the signing integration.",
			})
		}),

	// Download the certificate of completion from DocoChain
	downloadCertificate: protectedProcedure
		.input(z.string().min(1, "Project UUID is required"))
		.query(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Certificate download is temporarily unavailable while we rebuild the signing integration.",
			})
		}),

	// Get Passport Document
	getPassportDocument: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string(),
				view: z
					.enum([
						"blockchain",
						"history",
						"user_data",
						"verifiable_presentation",
						"certificate_url",
					])
					.optional()
					.default("blockchain"),
			})
		)
		.query(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Passport data is temporarily unavailable while we rebuild the signing integration.",
			})
		}),
})
