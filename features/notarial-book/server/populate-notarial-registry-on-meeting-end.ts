import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { getDoconchainProjectDetails } from "@/services/doconchain/projects/get-project-details"

function asNonEmptyString(v: unknown): string | null {
	if (typeof v !== "string") return null
	const t = v.trim()
	return t ? t : null
}

function defaultLocationStatement(): string {
	// Keep this deterministic for now; we can later derive from meeting/location data.
	return "I hereby certify that this electronic notarial act was executed while all parties concerned were situated within the Philippines."
}

function normalizeDoconchainSigners(raw: unknown): Array<{
	id: number
	email: string
	firstName: string
	lastName: string
	status: string
	signedAt: string | null
	sequence: number
	signerRole: string
}> {
	if (!Array.isArray(raw)) return []
	return raw
		.map((s): null | {
			id: number
			email: string
			firstName: string
			lastName: string
			status: string
			signedAt: string | null
			sequence: number
			signerRole: string
		} => {
			if (!s || typeof s !== "object") return null
			const obj = s as Record<string, unknown>
			const email = asNonEmptyString(obj.email) ?? ""
			if (!email) return null

			const idRaw = obj.id
			const id =
				typeof idRaw === "number"
					? idRaw
					: typeof idRaw === "string"
						? Number.parseInt(idRaw, 10)
						: Number.NaN

			const status = asNonEmptyString(obj.status) ?? "PENDING"
			const signedAt =
				asNonEmptyString(obj.signed_at) ?? asNonEmptyString(obj.signedAt) ?? null

			const sequenceRaw = obj.sequence
			const sequence =
				typeof sequenceRaw === "number"
					? sequenceRaw
					: typeof sequenceRaw === "string"
						? Number.parseInt(sequenceRaw, 10)
						: 0

			const signerRole =
				asNonEmptyString(obj.signer_role) ??
				asNonEmptyString(obj.role) ??
				"SIGNER"

			return {
				id: Number.isFinite(id) ? id : 0,
				email,
				firstName: asNonEmptyString(obj.first_name) ?? "",
				lastName: asNonEmptyString(obj.last_name) ?? "",
				status,
				signedAt,
				sequence: Number.isFinite(sequence) ? sequence : 0,
				signerRole,
			}
		})
		.filter((v): v is NonNullable<typeof v> => Boolean(v))
}

function isDoconchainProjectCompleted(details: Awaited<ReturnType<typeof getDoconchainProjectDetails>>): boolean {
	const statusUpper = String(details.projectStatus ?? "").trim().toUpperCase()
	return statusUpper === "COMPLETED" || details.completedAt !== null
}

/**
 * Populate the notarial registry when a meeting ends.
 *
 * Requirements:
 * - Only runs when host ends a specific meeting session.
 * - Idempotent per (ENP notarial book + DocOnChain project UUID).
 * - Only inserts acts for documents whose DocOnChain project is COMPLETED.
 */
export async function populateNotarialRegistryOnMeetingEnd(input: {
	meetingId: string
	meetingEndedAt: Date
}): Promise<{
	createdCount: number
	skippedCount: number
}> {
	const meetingId = input.meetingId.trim()
	if (!meetingId) throw new Error("meetingId is required")

	const meeting = await db.query.meetings.findFirst({
		where: eq(meetings.id, meetingId),
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
			documents: {
				columns: {
					id: true,
					name: true,
					description: true,
					notarizationType: true,
					docoChainProjectId: true,
				},
			},
		},
	})

	if (!meeting) throw new Error("Meeting not found")

	const acceptedParticipants = meeting.participants.filter(p => p.status === "ACCEPTED")

	const enp = acceptedParticipants.find(p => String(p.user?.role ?? "").trim().toUpperCase() === "ENP")
	const enpId = enp?.user?.id ?? null
	const enpEmail = asNonEmptyString(enp?.user?.email)?.toLowerCase() ?? null
	const enpName =
		asNonEmptyString(enp?.user?.name) ??
		asNonEmptyString(enp?.user?.email) ??
		"ENP"

	if (!enpId) throw new Error("ENP participant is required to populate notarial registry")
	if (!enpEmail) throw new Error("ENP email is required to fetch DocOnChain project details")

	const principal = acceptedParticipants.find(
		p => String(p.user?.role ?? "").trim().toUpperCase() === "PRINCIPAL" || p.participantRole === "PRINCIPAL"
	)
	const principalName =
		asNonEmptyString(principal?.user?.name) ??
		asNonEmptyString(principal?.user?.email) ??
		"Principal"

	// Get/create notarial book for ENP
	let book = await db.query.notarialBooks.findFirst({
		where: eq(notarialBooks.enpId, enpId),
	})
	if (!book) {
		const [created] = await db.insert(notarialBooks).values({ enpId }).returning()
		book = created ?? undefined
	}
	if (!book) throw new Error("Failed to resolve notarial book")

	// ENP profile (optional)
	const profile = await db.query.enpProfiles.findFirst({
		where: eq(enpProfiles.userId, enpId),
		columns: { rollNo: true },
	})

	const docsToConsider = (meeting.documents ?? []).filter(d => {
		const projectUuid = asNonEmptyString(d.docoChainProjectId)
		const actType = asNonEmptyString(d.notarizationType)
		return Boolean(projectUuid && actType)
	})

	if (docsToConsider.length === 0) {
		return { createdCount: 0, skippedCount: 0 }
	}

	// Idempotency: fetch existing acts for these project UUIDs in this book.
	const projectUuids = docsToConsider
		.map(d => asNonEmptyString(d.docoChainProjectId))
		.filter((v): v is string => Boolean(v))
	const existing = await db
		.select({ id: notarialActs.id, docoChainProjectUuid: notarialActs.docoChainProjectUuid })
		.from(notarialActs)
		.where(
			and(
				eq(notarialActs.notarialBookId, book.id),
				inArray(notarialActs.docoChainProjectUuid, projectUuids)
			)
		)
	const existingProjectUuids = new Set(
		existing
			.map(r => asNonEmptyString(r.docoChainProjectUuid))
			.filter((v): v is string => Boolean(v))
	)

	let createdCount = 0
	let skippedCount = 0

	for (const doc of docsToConsider) {
		const projectUuid = asNonEmptyString(doc.docoChainProjectId)
		const actType = asNonEmptyString(doc.notarizationType)
		if (!projectUuid || !actType) {
			skippedCount += 1
			continue
		}

		if (existingProjectUuids.has(projectUuid)) {
			skippedCount += 1
			continue
		}

		// Fetch DocOnChain completion & signer info at meeting end (only once per meeting end action)
		const details = await getDoconchainProjectDetails({ projectUuid, email: enpEmail })
		if (!isDoconchainProjectCompleted(details)) {
			skippedCount += 1
			continue
		}

		const executedAt =
			typeof details.completedAt === "string" && !Number.isNaN(new Date(details.completedAt).getTime())
				? new Date(details.completedAt)
				: input.meetingEndedAt

		const rawSigners = (details.raw?.data as unknown as { signers?: unknown } | undefined)?.signers
		const signers = normalizeDoconchainSigners(rawSigners)

		await db.insert(notarialActs).values({
			notarialBookId: book.id,
			actType,
			documentId: doc.id,
			docoChainProjectUuid: projectUuid,
			principalName,
			enpName,
			enpRollNumber: asNonEmptyString(profile?.rollNo),
			executedAt,
			meetingEndedAt: input.meetingEndedAt,
			workflow: "REN",
			locationStatement: defaultLocationStatement(),
			documentName: doc.name,
			documentDescription: doc.description ?? null,
			signersData: JSON.stringify(signers),
		})

		existingProjectUuids.add(projectUuid)
		createdCount += 1
	}

	return { createdCount, skippedCount }
}

