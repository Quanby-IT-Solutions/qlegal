import { TRPCError } from "@trpc/server"
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	or,
	type InferSelectModel,
} from "drizzle-orm"
import { z } from "zod/v4"

import { getFullName } from "@/core/lib/utils"

import { appointmentParticipants } from "@/services/drizzle/schema/appointment-participants"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { meetingParticipantIdentityChecks } from "@/services/drizzle/schema/meeting-participant-identity-checks"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { getServiceRoleClient } from "@/services/supabase"
import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { getCommissionStatus } from "@/services/supreme-court/api/commission-status"
import { syncNotarialActToSupremeCourt } from "@/services/supreme-court/lib/sync-notarial-act"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { env } from "@/env"

const getNotarialBookSchema = z.object({
	page: z.number().min(1).default(1),
	perPage: z.number().min(1).max(100).default(50),
	search: z.string().optional(),
	actType: z
		.enum(["ALL", "ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"])
		.default("ALL"),
	workflow: z.enum(["ALL", "REN", "IEN"]).default("ALL"),
	sortBy: z
		.enum([
			"executedAt",
			"meetingEndedAt",
			"registryNumber",
			"principalName",
			"documentName",
			"certificateNumber",
			"actType",
			"workflow",
		])
		.default("executedAt"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
})

const syncDocumentToNotarialBookSchema = z.object({
	documentId: z.string().min(1),
	projectUuid: z.string().min(1),
	actType: z.enum(["ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"]),
})

const syncActToSupremeCourtSchema = z.object({
	actId: z.string().min(1),
})

/**
 * Generate location statement for notarial act
 * Statement that the electronic notarial act was executed while all parties were
 * situated within the Philippines or in a Philippine embassy/consular office abroad
 */
function generateLocationStatement(location: string | undefined | null): string {
	const locationLower = (location ?? "Philippines").toLowerCase()

	// Check if location indicates Philippine embassy/consular office abroad
	const isPhilippineEmbassy =
		locationLower.includes("embassy") ||
		locationLower.includes("consular") ||
		locationLower.includes("consul") ||
		locationLower.includes("honorary consul")

	if (isPhilippineEmbassy) {
		return "I hereby certify that this electronic notarial act was executed while all parties concerned were situated within a Philippine embassy, consular office, or office of Philippine Honorary Consul abroad, in accordance with the limited extraterritorial performance of electronic notarial acts."
	}

	// Default statement for acts executed within the Philippines
	return "I hereby certify that this electronic notarial act was executed while all parties concerned were situated within the Philippines."
}

/**
 * Extract principal and witness information from passport data
 */
function extractSignerInfo(_passportData: unknown) {
	// External passport parsing removed while rebuilding signing integration.
	return { principal: undefined, witness: undefined, allSigners: [] as const }
}

function signerCountFromSignersData(signersData: string | null | undefined): string {
	if (!signersData?.trim()) return ""
	try {
		const parsed: unknown = JSON.parse(signersData)
		return Array.isArray(parsed) ? String(parsed.length) : ""
	} catch {
		return ""
	}
}

/** Strip binary/large fields; add signer count for exports (CSV/PDF). */
function toNotarialBookExportAct(row: InferSelectModel<typeof notarialActs>) {
	const { principalIdImageBase64, passportData, signersData, certificateUrl, ...rest } = row
	void principalIdImageBase64
	void passportData
	void certificateUrl
	return {
		...rest,
		signerCount: signerCountFromSignersData(signersData),
	}
}

export const notarialBookRouter = createTRPCRouter({
	/**
	 * Fetch notarial book entries from external signing provider.
	 * Notarial acts are populated when you end a session; use getNotarialBook for the local registry and sync to Supreme Court from the registry.
	 */
	getNotarialBookFromAPI: protectedProcedure.input(getNotarialBookSchema).query(async () => {
		throw new TRPCError({
			code: "SERVICE_UNAVAILABLE",
			message:
				"Use the Notarial Registry page: acts are populated when you end a session. Sync each act to Supreme Court from the registry.",
		})
	}),

	/**
	 * Get notarial book entries for the current ENP
	 * Uses locally stored notarial act records.
	 */
	getNotarialBook: protectedProcedure
		.input(getNotarialBookSchema.optional())
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { page, perPage, search, actType, workflow, sortBy, sortDir } =
				getNotarialBookSchema.parse(input ?? {})

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

			// Search across as many registry details as possible (server-side, so pagination/total are correct).
			// Note: signersData and passportData are stored as JSON strings (text) so we use ILIKE on them.
			const trimmedSearch = (search ?? "").trim()
			if (trimmedSearch.length > 0) {
				const q = `%${trimmedSearch}%`
				// Many fields are nullable; only include ILIKE conditions for non-null columns.
				const searchClauses = [
					ilike(notarialActs.principalName, q),
					ilike(notarialActs.enpName, q),
					ilike(notarialActs.actType, q),
					ilike(notarialActs.workflow, q),
					notarialActs.location ? ilike(notarialActs.location, q) : undefined,
					notarialActs.certificateNumber ? ilike(notarialActs.certificateNumber, q) : undefined,
					notarialActs.documentName ? ilike(notarialActs.documentName, q) : undefined,
					notarialActs.documentDescription ? ilike(notarialActs.documentDescription, q) : undefined,
					notarialActs.principalIdNumber ? ilike(notarialActs.principalIdNumber, q) : undefined,
					notarialActs.principalAddress ? ilike(notarialActs.principalAddress, q) : undefined,
					notarialActs.principalIdType ? ilike(notarialActs.principalIdType, q) : undefined,
					notarialActs.witnessName ? ilike(notarialActs.witnessName, q) : undefined,
					notarialActs.witnessIdNumber ? ilike(notarialActs.witnessIdNumber, q) : undefined,
					notarialActs.locationStatement ? ilike(notarialActs.locationStatement, q) : undefined,
					notarialActs.ipAddress ? ilike(notarialActs.ipAddress, q) : undefined,
					notarialActs.docoChainProjectUuid
						? ilike(notarialActs.docoChainProjectUuid, q)
						: undefined,
					notarialActs.signersData ? ilike(notarialActs.signersData, q) : undefined,
					notarialActs.passportData ? ilike(notarialActs.passportData, q) : undefined,
				].filter((v): v is NonNullable<typeof v> => v !== undefined && v !== null)

				if (searchClauses.length > 0) {
					const searchCondition = or(...searchClauses)
					if (searchCondition) {
						filters.push(searchCondition)
					}
				}
			}

			// Stable "registry number" should reflect chronological completion order across ALL acts,
			// independent of sorting/filtering. Compute a map from the full notarial book list.
			const allActsForNumbering = await ctx.db
				.select({
					id: notarialActs.id,
					executedAt: notarialActs.executedAt,
					createdAt: notarialActs.createdAt,
				})
				.from(notarialActs)
				.where(eq(notarialActs.notarialBookId, notarialBook.id))
				.orderBy(asc(notarialActs.executedAt), asc(notarialActs.createdAt))

			const registryNumberByActId = new Map<string, number>()
			for (let i = 0; i < allActsForNumbering.length; i++) {
				const row = allActsForNumbering[i]
				if (row) registryNumberByActId.set(row.id, i + 1)
			}

			const dir = sortDir === "asc" ? asc : desc
			const orderBy = (() => {
				switch (sortBy) {
					case "registryNumber":
						// Registry number is defined by executedAt/createdAt chronological order.
						return [dir(notarialActs.executedAt), dir(notarialActs.createdAt)] as const
					case "meetingEndedAt":
						return [dir(notarialActs.meetingEndedAt), dir(notarialActs.createdAt)] as const
					case "principalName":
						return [dir(notarialActs.principalName), dir(notarialActs.executedAt)] as const
					case "documentName":
						return [dir(notarialActs.documentName), dir(notarialActs.executedAt)] as const
					case "certificateNumber":
						return [dir(notarialActs.certificateNumber), dir(notarialActs.executedAt)] as const
					case "actType":
						return [dir(notarialActs.actType), dir(notarialActs.executedAt)] as const
					case "workflow":
						return [dir(notarialActs.workflow), dir(notarialActs.executedAt)] as const
					case "executedAt":
					default:
						return [dir(notarialActs.executedAt), dir(notarialActs.createdAt)] as const
				}
			})()

			// Get notarial acts with pagination + requested sorting
			const acts = await ctx.db
				.select()
				.from(notarialActs)
				.where(and(...filters))
				.orderBy(...orderBy)
				.limit(perPage)
				.offset((page - 1) * perPage)

			// Get total count using proper count function
			const [totalResult] = await ctx.db
				.select({ count: count() })
				.from(notarialActs)
				.where(and(...filters))

			const total = totalResult?.count ?? 0

			const filteredActs = acts

			// Enrich acts with fees from document table (fees are stored on document, not notarial_act)
			const documentIds = [
				...new Set(
					filteredActs
						.map(a => a.documentId)
						.filter((id): id is string => typeof id === "string" && id.length > 0)
				),
			]
			const docoChainUuids = [
				...new Set(
					filteredActs
						.map(a => a.docoChainProjectUuid)
						.filter((id): id is string => typeof id === "string" && id.length > 0)
				),
			]
			const docFeesMap = new Map<string, number | null>()
			if (documentIds.length > 0) {
				const docs = await ctx.db
					.select({ id: documents.id, fees: documents.fees })
					.from(documents)
					.where(inArray(documents.id, documentIds))
				for (const d of docs) {
					const raw = d.fees
					docFeesMap.set(
						d.id,
						raw !== null && raw !== undefined && typeof raw === "number" && !Number.isNaN(raw)
							? raw
							: null
					)
				}
			}
			if (docoChainUuids.length > 0) {
				const docsByProject = await ctx.db
					.select({ docoChainProjectId: documents.docoChainProjectId, fees: documents.fees })
					.from(documents)
					.where(inArray(documents.docoChainProjectId, docoChainUuids))
				for (const d of docsByProject) {
					if (d.docoChainProjectId) {
						const raw = d.fees
						const val =
							raw !== null && raw !== undefined && typeof raw === "number" && !Number.isNaN(raw)
								? raw
								: null
						if (!docFeesMap.has(d.docoChainProjectId)) {
							docFeesMap.set(d.docoChainProjectId, val)
						}
					}
				}
			}

			// Batch-fetch identity check snapshots for acts that have principalIdentityCheckId
			const identityCheckIds = [
				...new Set(
					filteredActs
						.map(a => a.principalIdentityCheckId)
						.filter((id): id is string => typeof id === "string" && id.length > 0)
				),
			]
			const identityCheckSnapshotMap = new Map<
				string,
				{
					snapshotDocumentType: string | null
					snapshotDocumentNumber: string | null
					snapshotFullName: string | null
					snapshotFrontImageUrl: string | null
					snapshotExpiresAt: Date | null
				}
			>()
			if (identityCheckIds.length > 0) {
				const identityChecks = await ctx.db
					.select({
						id: meetingParticipantIdentityChecks.id,
						snapshotDocumentType: meetingParticipantIdentityChecks.snapshotDocumentType,
						snapshotDocumentNumber: meetingParticipantIdentityChecks.snapshotDocumentNumber,
						snapshotFullName: meetingParticipantIdentityChecks.snapshotFullName,
						snapshotFrontImageUrl: meetingParticipantIdentityChecks.snapshotFrontImageUrl,
						snapshotExpiresAt: meetingParticipantIdentityChecks.snapshotExpiresAt,
					})
					.from(meetingParticipantIdentityChecks)
					.where(inArray(meetingParticipantIdentityChecks.id, identityCheckIds))
				for (const ic of identityChecks) {
					identityCheckSnapshotMap.set(ic.id, {
						snapshotDocumentType: ic.snapshotDocumentType ?? null,
						snapshotDocumentNumber: ic.snapshotDocumentNumber ?? null,
						snapshotFullName: ic.snapshotFullName ?? null,
						snapshotFrontImageUrl: ic.snapshotFrontImageUrl ?? null,
						snapshotExpiresAt: ic.snapshotExpiresAt ?? null,
					})
				}
			}

			const enrichedActs = filteredActs.map(act => {
				const fees =
					(act.documentId ? docFeesMap.get(act.documentId) : undefined) ??
					(act.docoChainProjectUuid ? docFeesMap.get(act.docoChainProjectUuid) : undefined) ??
					null
				const registryNumber = registryNumberByActId.get(act.id) ?? null
				const identityCheckSnapshot = act.principalIdentityCheckId
					? (identityCheckSnapshotMap.get(act.principalIdentityCheckId) ?? null)
					: null
				return { ...act, fees, registryNumber, identityCheckSnapshot }
			})

			return {
				acts: enrichedActs,
				total,
				page,
				perPage,
				totalPages: Math.ceil(total / perPage),
			}
		}),

	/**
	 * Sync a notarial act to Supreme Court (ENP only).
	 * Returns notarialRegistryID (NRID) and notarialRegistryNumber (NRN).
	 */
	syncActToSupremeCourt: protectedProcedure
		.input(syncActToSupremeCourtSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { actId } = input

			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})
			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can sync acts to Supreme Court",
				})
			}

			if (!isConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Supreme Court API is not configured",
				})
			}

			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, actId),
			})
			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			const book = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})
			if (book?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not own this notarial act",
				})
			}

			const enpProfile = await ctx.db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, userId),
			})
			const nfn = env.SUPREME_COURT_NFN
			if (!enpProfile?.notaryPublicNumber || !nfn || !enpProfile?.rollNo) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "ENP profile missing NPN or RN, or SUPREME_COURT_NFN not set",
				})
			}

			let documentFile: Buffer | undefined
			let documentFileName: string | undefined
			if (act.documentId) {
				const document = await ctx.db.query.documents.findFirst({
					where: eq(documents.id, act.documentId),
					columns: { path: true, name: true },
				})
				if (document?.path) {
					const supabase = getServiceRoleClient()
					const { data: fileData, error: downloadError } = await supabase.storage
						.from("documents")
						.download(document.path)
					if (!downloadError && fileData) {
						const arrayBuffer = await fileData.arrayBuffer()
						documentFile = Buffer.from(arrayBuffer)
						documentFileName = document.name ?? "document.pdf"
					}
				}
			}

			const result = await syncNotarialActToSupremeCourt({
				act,
				notaryFacilityNumber: nfn,
				notaryPublicNumber: enpProfile.notaryPublicNumber,
				rollNumber: enpProfile.rollNo,
				documentFile,
				documentFileName,
			})

			await ctx.db
				.update(notarialActs)
				.set({
					syncedToSupremeCourt: true,
					syncedAt: new Date(),
					supremeCourtRegistryId: result.notarialRegistryID,
				})
				.where(eq(notarialActs.id, actId))

			return {
				notarialRegistryID: result.notarialRegistryID,
				notarialRegistryNumber: result.notarialRegistryNumber,
			}
		}),

	/**
	 * Sync a completed document to the notarial book.
	 * Notarial acts are auto-populated when you end a session; use the Notarial Registry to sync acts to Supreme Court.
	 */
	syncDocumentToNotarialBook: protectedProcedure
		.input(syncDocumentToNotarialBookSchema)
		.mutation(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Notarial acts are populated when you end a session. Use the Notarial Registry page and sync each act to Supreme Court there.",
			})
		}),

	/**
	 * Auto-sync all completed documents for the ENP.
	 * Notarial acts are auto-populated when you end a session; sync to Supreme Court from the registry.
	 */
	autoSyncAllDocuments: protectedProcedure.mutation(async () => {
		throw new TRPCError({
			code: "SERVICE_UNAVAILABLE",
			message:
				"Notarial acts are populated when you end a session. Use the Notarial Registry and sync each act to Supreme Court.",
		})
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

			if (!act.documentId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document URL not available.",
				})
			}

			const doc = await ctx.db.query.documents.findFirst({
				where: eq(documents.id, act.documentId),
				columns: { path: true, name: true },
			})

			if (!doc?.path) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document file not available. No storage path found.",
				})
			}

			const url = await getDocumentPublicUrl(doc.path)
			return {
				url,
				fileName: doc.name ?? act.documentName ?? "document.pdf",
				type: "document",
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Document URL not available.",
			})
		}),

	/**
	 * Get document URL for viewing/downloading (Notarial Book 2 - Programmatic)
	 * Programmatic variant (currently backed by Supabase document storage).
	 */
	getDocumentUrl2: protectedProcedure
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

			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this document",
				})
			}

			// Prefer DocOnChain sealed/notarized document when available.
			if (act.docoChainProjectUuid?.trim()) {
				return {
					url: `/api/notarial-book-2/documents/${act.id}`,
					fileName: act.documentName ?? `notarized-document-${act.docoChainProjectUuid}.pdf`,
					type: "document",
				}
			}

			const doc = await ctx.db.query.documents.findFirst({
				where: act.documentId ? eq(documents.id, act.documentId) : undefined,
				columns: { path: true, name: true },
			})

			if (!doc?.path) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document file not available. No storage path found.",
				})
			}

			const url = await getDocumentPublicUrl(doc.path)
			return {
				url,
				fileName: doc.name ?? act.documentName ?? "document.pdf",
				type: "document",
			}
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

			if (act.docoChainProjectUuid) {
				throw new TRPCError({
					code: "SERVICE_UNAVAILABLE",
					message:
						"Certificate retrieval from the signing provider is temporarily unavailable while we rebuild the integration.",
				})
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Certificate not available",
			})
		}),

	/**
	 * Get signers for a notarial act.
	 */
	getActSigners: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			type ActSigner = {
				id?: number | string
				email?: string
				firstName?: string
				lastName?: string
				status?: string
				signedAt?: string | null
				sequence?: number
				signerRole?: string
			} & Record<string, unknown>
			const userId = ctx.session.user.id

			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access act signers",
				})
			}

			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this act",
				})
			}

			// Witness/principal from document_signers (assigned by ENP when adding signers), not from invite/participantRole
			const witnessEmails = new Set<string>()
			const principalEmails = new Set<string>()
			const enpEmailLower =
				typeof notarialBook?.enpId === "string"
					? (
							(
								await ctx.db.query.users.findFirst({
									where: eq(users.id, notarialBook.enpId),
									columns: { email: true },
								})
							)?.email ?? ""
						)
							.trim()
							.toLowerCase()
					: ""
			if (act.documentId) {
				const docSignersForRole = await ctx.db.query.documentSigners.findMany({
					where: and(
						eq(documentSigners.documentId, act.documentId),
						eq(documentSigners.signerRole, "witness")
					),
					with: { user: { columns: { email: true } } },
				})
				for (const ds of docSignersForRole) {
					if (ds.user?.email) witnessEmails.add(ds.user.email.trim().toLowerCase())
				}

				const principalDocSigners = await ctx.db.query.documentSigners.findMany({
					where: and(
						eq(documentSigners.documentId, act.documentId),
						eq(documentSigners.signerRole, "principal")
					),
					with: { user: { columns: { email: true } } },
				})
				for (const ds of principalDocSigners) {
					if (ds.user?.email) principalEmails.add(ds.user.email.trim().toLowerCase())
				}
			}

			const enrichSignerRole = (s: ActSigner) => {
				const emailLower = (s.email ?? "").trim().toLowerCase()
				const baseRole = (s.signerRole ?? "Signer").trim()

				// ENP is always the Notary in notarial registry context.
				if (emailLower && enpEmailLower && emailLower === enpEmailLower) {
					return { ...s, signerRole: "Notary" }
				}

				// Principal(s) for this document (can be principal or witness during session, but principal here).
				if (principalEmails.has(emailLower)) {
					return { ...s, signerRole: "Principal" }
				}

				// Only use our own witness mapping from document_signers; ignore upstream signerRole
				// so ENP (notary) never incorrectly appears as a Witness.
				if (witnessEmails.has(emailLower)) {
					return { ...s, signerRole: "Witness" }
				}

				// Fall back to the original (or generic) signer role.
				return { ...s, signerRole: baseRole || "Signer" }
			}

			// Return stored signers if we have them (avoids 401 when no meeting/project token)
			if (act.signersData && typeof act.signersData === "string") {
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
					if (Array.isArray(stored) && stored.length > 0) {
						// Fetch user data for each signer to get address information
						const signersWithAddress = await Promise.all(
							stored.map(async signer => {
								const signerUser = await ctx.db.query.users.findFirst({
									where: eq(users.email, signer.email),
									columns: {
										id: true,
										homeStreet: true,
										barangay: true,
										cityProvince: true,
										address: true,
									},
								})

								const idCardDetail = signerUser?.id
									? await ctx.db.query.idCardDetails.findFirst({
											where: eq(idCardDetails.userId, signerUser.id),
											orderBy: (table, { desc }) => [desc(table.verifiedAt)],
										})
									: null

								return {
									...signer,
									homeStreet: signerUser?.homeStreet ?? null,
									barangay: signerUser?.barangay ?? null,
									cityProvince: signerUser?.cityProvince ?? null,
									fullAddress: signerUser?.address ?? null,
									idFaceImageBase64: idCardDetail?.faceImageUrl
										? String(idCardDetail.faceImageUrl)
										: null,
									idDocumentType: idCardDetail?.documentType ?? null,
									idDocumentNumber: idCardDetail?.documentNumber ?? null,
									idVerified:
										typeof idCardDetail?.isVerified === "boolean" ? idCardDetail.isVerified : null,
								}
							})
						)
						// Apply witness enrichment so UI shows Witness badge from participantRole
						return { signers: signersWithAddress.map(enrichSignerRole) }
					}
				} catch {
					// invalid JSON, fall through to fetch
				}
			}

			// Fallback: build signers from document_signers + signature_requests when no stored signersData
			if (act.documentId) {
				const docSigners = await ctx.db.query.documentSigners.findMany({
					where: eq(documentSigners.documentId, act.documentId),
					with: {
						user: {
							columns: {
								id: true,
								email: true,
								firstName: true,
								middleName: true,
								lastName: true,
								homeStreet: true,
								barangay: true,
								cityProvince: true,
								address: true,
							},
						},
					},
					orderBy: [documentSigners.signingOrder, documentSigners.createdAt],
				})

				if (docSigners.length > 0) {
					const signersFromDb = await Promise.all(
						docSigners.map(async (ds, idx) => {
							const email = ds.user?.email?.trim() ?? ""
							const nameParts = (ds.signerName ?? getFullName(ds.user) ?? "").trim().split(/\s+/)
							const firstName = nameParts[0] ?? ""
							const lastName = nameParts.slice(1).join(" ") || ""

							let status = "PENDING"
							let signedAt: string | null = null
							if (ds.userId) {
								const req = await ctx.db.query.signatureRequests.findFirst({
									where: and(
										eq(signatureRequests.documentId, act.documentId!),
										eq(signatureRequests.signerId, ds.userId)
									),
									columns: { status: true, signedAt: true },
								})
								if (req) {
									status = (req.status ?? "PENDING").toUpperCase()
									signedAt = req.signedAt ? req.signedAt.toISOString() : null
								}
							}

							const idCardDetail = ds.user?.id
								? await ctx.db.query.idCardDetails.findFirst({
										where: eq(idCardDetails.userId, ds.user.id),
										orderBy: (table, { desc }) => [desc(table.verifiedAt)],
									})
								: null

							return {
								id: idx + 1,
								email,
								firstName: firstName || undefined,
								lastName: lastName || undefined,
								status,
								signedAt,
								sequence: ds.signingOrder ?? idx + 1,
								signerRole:
									ds.signerRole === "witness"
										? "Witness"
										: ds.signerRole === "principal"
											? "Principal"
											: "Signer",
								homeStreet: ds.user?.homeStreet ?? null,
								barangay: ds.user?.barangay ?? null,
								cityProvince: ds.user?.cityProvince ?? null,
								fullAddress: ds.signerAddress ?? ds.user?.address ?? null,
								idFaceImageBase64: idCardDetail?.faceImageUrl
									? String(idCardDetail.faceImageUrl)
									: null,
								idDocumentType: idCardDetail?.documentType ?? null,
								idDocumentNumber: idCardDetail?.documentNumber ?? null,
								idVerified:
									typeof idCardDetail?.isVerified === "boolean" ? idCardDetail.isVerified : null,
							}
						})
					)
					const signersEnriched = signersFromDb.map(enrichSignerRole)
					// Backfill act so next time we have signersData
					await ctx.db
						.update(notarialActs)
						.set({
							signersData: JSON.stringify(
								signersEnriched.map(s => ({
									id: s.id,
									email: s.email,
									firstName: s.firstName,
									lastName: s.lastName,
									status: s.status,
									signedAt: s.signedAt,
									sequence: s.sequence,
									signerRole: s.signerRole,
								}))
							),
						})
						.where(eq(notarialActs.id, act.id))
					return { signers: signersEnriched }
				}

				// Fallback when no document_signers: build from signature_requests (e.g. principal-only signing)
				const requests = await ctx.db.query.signatureRequests.findMany({
					where: eq(signatureRequests.documentId, act.documentId),
					with: {
						signer: {
							columns: {
								id: true,
								email: true,
								firstName: true,
								middleName: true,
								lastName: true,
								homeStreet: true,
								barangay: true,
								cityProvince: true,
								address: true,
							},
						},
					},
				})
				if (requests.length > 0) {
					const signersFromRequests = await Promise.all(
						requests.map(async (req, idx) => {
							const u = req.signer
							const email = u?.email?.trim() ?? ""
							const nameParts = getFullName(u).trim().split(/\s+/)
							const firstName = nameParts[0] ?? ""
							const lastName = nameParts.slice(1).join(" ") ?? ""
							const status = (req.status ?? "PENDING").toUpperCase()
							const signedAt = req.signedAt ? req.signedAt.toISOString() : null
							const idCardDetail = u?.id
								? await ctx.db.query.idCardDetails.findFirst({
										where: eq(idCardDetails.userId, u.id),
										orderBy: (table, { desc }) => [desc(table.verifiedAt)],
									})
								: null
							return {
								id: idx + 1,
								email,
								firstName: firstName || undefined,
								lastName: lastName || undefined,
								status,
								signedAt,
								sequence: idx + 1,
								signerRole: "Signer",
								homeStreet: u?.homeStreet ?? null,
								barangay: u?.barangay ?? null,
								cityProvince: u?.cityProvince ?? null,
								fullAddress: u?.address ?? null,
								idFaceImageBase64: idCardDetail?.faceImageUrl
									? String(idCardDetail.faceImageUrl)
									: null,
								idDocumentType: idCardDetail?.documentType ?? null,
								idDocumentNumber: idCardDetail?.documentNumber ?? null,
								idVerified:
									typeof idCardDetail?.isVerified === "boolean" ? idCardDetail.isVerified : null,
							}
						})
					)
					const signersEnriched = signersFromRequests.map(enrichSignerRole)
					await ctx.db
						.update(notarialActs)
						.set({
							signersData: JSON.stringify(
								signersEnriched.map(s => ({
									id: s.id,
									email: s.email,
									firstName: s.firstName,
									lastName: s.lastName,
									status: s.status,
									signedAt: s.signedAt,
									sequence: s.sequence,
									signerRole: s.signerRole,
								}))
							),
						})
						.where(eq(notarialActs.id, act.id))
					return { signers: signersEnriched }
				}
			}

			return { signers: [] }
		}),

	/**
	 * Get Notary Public Commission Status from Supreme Court eNotarization API.
	 * Use this to verify a notary's commission is Active before syncing.
	 */
	getCommissionStatus: protectedProcedure
		.input(
			z.object({
				npn: z.string().min(1, "NPN is required"),
				rn: z.string().min(1, "RN is required"),
			})
		)
		.query(async ({ input }) => {
			if (!isConfigured()) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Supreme Court API is not configured. Add credentials to .env",
				})
			}
			return getCommissionStatus(input.npn, input.rn)
		}),

	/**
	 * Export notarial book metadata for client-generated PDF/CSV (no embedded ID images).
	 */
	exportNotarialBook: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id

		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can export notarial book",
			})
		}

		const notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notarial book not found",
			})
		}

		const enpProfile = await ctx.db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, userId),
			columns: { rollNo: true, notaryPublicNumber: true },
		})

		const notaryPublicName =
			getFullName(user).trim() || (user?.email?.trim() ?? "Electronic Notary Public")

		const acts = await ctx.db
			.select()
			.from(notarialActs)
			.where(eq(notarialActs.notarialBookId, notarialBook.id))
			.orderBy(asc(notarialActs.executedAt))

		const exportActs = acts.map(toNotarialBookExportAct)

		return {
			meta: {
				generatedAtIso: new Date().toISOString(),
				bookId: notarialBook.id,
				notaryPublicName,
				notaryRollNumber: enpProfile?.rollNo?.trim() ?? null,
				notaryPublicNumber: enpProfile?.notaryPublicNumber?.trim() ?? null,
				electronicNotarialFacility: "Quanby Sign",
				actCount: exportActs.length,
			},
			acts: exportActs,
		}
	}),
})
