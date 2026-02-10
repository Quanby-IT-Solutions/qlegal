import { TRPCError } from "@trpc/server"
import { desc, eq, ilike, or } from "drizzle-orm"
import { z } from "zod"

import { checkSigningStatus, downloadSignedDocument } from "@/services/doconchain"
import { notarialActs } from "@/services/drizzle/schema/notarial-book"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

export const documentsRouter = createTRPCRouter({
	getMyNotarizedDocuments: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id
		const userName = ctx.session.user.name
		const userEmail = ctx.session.user.email

		// Build conditions to match principalName against user's name OR email (case-insensitive)
		const conditions = []

		if (userName) {
			conditions.push(ilike(notarialActs.principalName, `%${userName}%`))
		}

		if (userEmail) {
			conditions.push(ilike(notarialActs.principalName, `%${userEmail}%`))
		}

		// If neither name nor email exists, return empty array
		if (conditions.length === 0) {
			return []
		}

		// Build where condition - use or() if multiple conditions, otherwise use the single condition
		const whereCondition = conditions.length > 1 ? or(...conditions) : conditions[0]

		// Query notarialActs with document join
		const acts = await ctx.db.query.notarialActs.findMany({
			where: whereCondition,
			orderBy: [desc(notarialActs.executedAt)],
			with: {
				document: {
					columns: {
						id: true,
						name: true,
						description: true,
						type: true,
						path: true,
					},
				},
			},
		})

		// Transform to include all required fields, including signed document references
		return acts.map(act => ({
			id: act.id,
			documentId: act.documentId,
			documentName: act.documentName ?? act.document?.name ?? "Unknown Document",
			documentDescription: act.documentDescription,
			executedAt: act.executedAt,
			enpName: act.enpName,
			enpRollNumber: act.enpRollNumber,
			certificateNumber: act.certificateNumber,
			certificateUrl: act.certificateUrl,
			docoChainProjectUuid: act.docoChainProjectUuid,
			actType: act.actType as "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING",
			workflow: act.workflow,
			locationStatement: act.locationStatement,
			document: act.document,
		}))
	}),

	getSignedDocument: protectedProcedure
		.input(z.object({ actId: z.string().min(1, "Act ID is required") }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const userName = ctx.session.user.name
			const userEmail = ctx.session.user.email

			// Find the notarial act
			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			// Verify principal access - check if principalName matches user's name or email
			const principalName = act.principalName.toLowerCase()
			const hasAccess =
				(userName && principalName.includes(userName.toLowerCase())) ||
				(userEmail && principalName.includes(userEmail.toLowerCase()))

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this document",
				})
			}

			// Check if docoChainProjectUuid exists
			if (!act.docoChainProjectUuid) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Signed document is not available. This document may not have been fully signed yet.",
				})
			}

			try {
				// Verify document is fully signed
				const signingStatus = await checkSigningStatus(
					act.docoChainProjectUuid,
					userEmail ?? undefined
				)

				if (!signingStatus.isFullySigned) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Document is not fully signed yet. Status: ${signingStatus.projectStatus}, Signed: ${signingStatus.signedCount}/${signingStatus.totalSigners}`,
					})
				}

				// Download the signed document
				const { buffer, fileName, url } = await downloadSignedDocument(
					act.docoChainProjectUuid,
					userEmail ?? undefined
				)

				// Convert buffer to base64 for transmission
				const base64 = buffer.toString("base64")

				return {
					success: true,
					fileName: fileName || act.documentName || "document.pdf",
					documentUrl: url,
					base64,
					size: buffer.length,
				}
			} catch (error) {
				console.error("❌ Error downloading signed document:", error)

				// If it's already a TRPCError, re-throw it
				if (error instanceof TRPCError) {
					throw error
				}

				// Otherwise, wrap it in a TRPCError
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to download signed document",
				})
			}
		}),
})
