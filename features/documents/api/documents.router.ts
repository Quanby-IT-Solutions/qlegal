import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or } from "drizzle-orm"
import { z } from "zod"

import { users } from "@/services/drizzle/schema/auth"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
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
			location: act.location,
			locationStatement: act.locationStatement,
			document: act.document,
		}))
	}),

	/** Get signers for a notarial act; only allowed when the current user is the principal. */
	getActSigners: protectedProcedure
		.input(z.object({ actId: z.string().min(1, "Act ID is required") }))
		.query(async ({ ctx, input }) => {
			const userName = ctx.session.user.name
			const userEmail = ctx.session.user.email

			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
				columns: { id: true, documentId: true, principalName: true, signersData: true },
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

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

			// Witness/principal from document_signers (assigned by ENP when adding signers)
			const witnessEmails = new Set<string>()
			const principalEmails = new Set<string>()
			if (act.documentId) {
				const witnessSignerRows = await ctx.db.query.documentSigners.findMany({
					where: and(
						eq(documentSigners.documentId, act.documentId),
						eq(documentSigners.signerRole, "witness")
					),
					with: { user: { columns: { email: true } } },
				})
				for (const ds of witnessSignerRows) {
					if (ds.user?.email) witnessEmails.add(ds.user.email.trim().toLowerCase())
				}

				const principalSignerRows = await ctx.db.query.documentSigners.findMany({
					where: and(
						eq(documentSigners.documentId, act.documentId),
						eq(documentSigners.signerRole, "principal")
					),
					with: { user: { columns: { email: true } } },
				})
				for (const ds of principalSignerRows) {
					if (ds.user?.email) principalEmails.add(ds.user.email.trim().toLowerCase())
				}
			}

			if (!act.signersData) {
				return { signers: [] }
			}
			try {
				const stored = JSON.parse(act.signersData) as Array<{
					id: number
					email: string
					firstName: string
					lastName: string
					status: string
					signedAt: string | null
					sequence: number
					signerRole: string
				}>
				const signers = Array.isArray(stored) ? stored : []
				const enriched = signers.map(s => {
					const emailLower = (s.email ?? "").trim().toLowerCase()
					const baseRole = (s.signerRole ?? "Signer").trim()

					if (principalEmails.has(emailLower)) {
						return { ...s, signerRole: "Principal" }
					}

					if (witnessEmails.has(emailLower)) {
						return { ...s, signerRole: "Witness" }
					}

					return { ...s, signerRole: baseRole || "Signer" }
				})
				// Fetch user address per signer
				const signersWithAddress = await Promise.all(
					enriched.map(async s => {
						const signerUser = await ctx.db.query.users.findFirst({
							where: eq(users.email, s.email),
							columns: {
								address: true,
								homeStreet: true,
								barangay: true,
								cityProvince: true,
							},
						})
						const parts = [
							signerUser?.homeStreet,
							signerUser?.barangay,
							signerUser?.cityProvince,
						].filter(Boolean) as string[]
						const fullAddress = signerUser?.address ?? (parts.length > 0 ? parts.join(", ") : null)
						return {
							...s,
							fullAddress,
							homeStreet: signerUser?.homeStreet ?? null,
							barangay: signerUser?.barangay ?? null,
							cityProvince: signerUser?.cityProvince ?? null,
						}
					})
				)
				return { signers: signersWithAddress }
			} catch {
				return { signers: [] }
			}
		}),

	getSignedDocument: protectedProcedure
		.input(z.object({ actId: z.string().min(1, "Act ID is required") }))
		.query(async ({ ctx, input }) => {
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

			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Signed document retrieval is currently unavailable while we rebuild the signing integration.",
			})
		}),
})
