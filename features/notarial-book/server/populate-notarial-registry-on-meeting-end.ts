import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { documents } from "@/services/drizzle/schema/document"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { getDoconchainProjectDetails } from "@/services/doconchain/projects/get-project-details"
import { getServiceRoleClient } from "@/services/supabase"
import { isConfigured as isSupremeCourtConfigured } from "@/services/supreme-court/lib/token-cache"
import { syncNotarialActToSupremeCourt } from "@/services/supreme-court/lib/sync-notarial-act"

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
			appointments: {
				with: {
					createdBy: {
						columns: { id: true, name: true, email: true, role: true },
					},
					participants: {
						columns: { userId: true, status: true, participantRole: true },
						with: {
							user: {
								columns: { id: true, name: true, email: true, role: true },
							},
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
					order: true,
					createdAt: true,
				},
			},
		},
	})

	if (!meeting) throw new Error("Meeting not found")

	// ENP = appointment owner (createdBy). Principal = accepted PARTICIPANT (non-HOST).
	const appointment = (meeting.appointments ?? [])[0]
	if (!appointment?.createdBy) throw new Error("Appointment or ENP not found for this meeting")

	const enpId = appointment.createdBy.id
	const enpEmail = asNonEmptyString(appointment.createdBy.email)?.toLowerCase() ?? null
	const enpName =
		asNonEmptyString(appointment.createdBy.name) ??
		asNonEmptyString(appointment.createdBy.email) ??
		"ENP"

	if (!enpId) throw new Error("ENP participant is required to populate notarial registry")
	if (!enpEmail) throw new Error("ENP email is required to fetch DocOnChain project details")

	const acceptedParticipants = (appointment.participants ?? []).filter(p => p.status === "ACCEPTED")
	const principalParticipant = acceptedParticipants.find(
		p => p.participantRole === "PARTICIPANT" || p.userId !== enpId
	)
	const principalName =
		asNonEmptyString(principalParticipant?.user?.name) ??
		asNonEmptyString(principalParticipant?.user?.email) ??
		asNonEmptyString(appointment.createdBy.name) ??
		"Principal"

	// Principal disclosure: ID number, ID image, ID type, address (for notarial registry)
	let principalIdNumber: string | null = null
	let principalIdImageBase64: string | null = null
	let principalIdType: string | null = null
	let principalAddress: string | null = null
	const principalUserId = principalParticipant?.userId
	if (principalUserId) {
		const principalUser = await db.query.users.findFirst({
			where: eq(users.id, principalUserId),
			columns: {
				address: true,
				homeStreet: true,
				barangay: true,
				cityProvince: true,
			},
		})
		if (principalUser) {
			const fromParts = [principalUser.homeStreet, principalUser.barangay, principalUser.cityProvince]
				.filter(Boolean)
				.join(", ")
			principalAddress =
				asNonEmptyString(principalUser.address) ??
				(asNonEmptyString(fromParts) || null)
		}
		const idCard = await db.query.idCardDetails.findFirst({
			where: eq(idCardDetails.userId, principalUserId),
			orderBy: [desc(idCardDetails.verifiedAt)],
			columns: {
				documentNumber: true,
				faceImageUrl: true,
				documentType: true,
				rawOcrData: true,
			},
		})
		if (idCard) {
			principalIdNumber = asNonEmptyString(idCard.documentNumber)
			principalIdImageBase64 = asNonEmptyString(idCard.faceImageUrl)
			principalIdType = asNonEmptyString(idCard.documentType) ?? (() => {
				try {
					const ocr = idCard.rawOcrData as Record<string, unknown> | null | undefined
					if (!ocr || typeof ocr !== "object") return null
					const docType =
						ocr.documentId ??
						ocr.documentType ??
						ocr.idType ??
						ocr.document_type ??
						ocr.id_type ??
						ocr.type ??
						ocr.module
					if (typeof docType !== "string") return null
					const map: Record<string, string> = {
						dl: "Driver's License",
						national_id: "National ID",
						passport: "Passport",
						voter_id: "Voter's ID",
						"driver's license": "Driver's License",
						"national id": "National ID",
						"voter id": "Voter's ID",
					}
					return map[docType.toLowerCase()] ?? docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, " ")
				} catch {
					return null
				}
			})()
		}
	}

	// Get/create notarial book for ENP
	let book = await db.query.notarialBooks.findFirst({
		where: eq(notarialBooks.enpId, enpId),
	})
	if (!book) {
		const [created] = await db.insert(notarialBooks).values({ enpId }).returning()
		book = created ?? undefined
	}
	if (!book) throw new Error("Failed to resolve notarial book")

	// ENP profile (for roll number and optional Supreme Court sync)
	const profile = await db.query.enpProfiles.findFirst({
		where: eq(enpProfiles.userId, enpId),
		columns: { rollNo: true, notaryPublicNumber: true, notaryFacilityNumber: true },
	})

	const docsToConsider = (meeting.documents ?? [])
		.slice()
		.sort((a, b) => {
			// Deterministic: meeting document order first, then createdAt, then id.
			const aOrder = typeof a.order === "number" ? a.order : 0
			const bOrder = typeof b.order === "number" ? b.order : 0
			if (aOrder !== bOrder) return aOrder - bOrder

			const aCreated = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
			const bCreated = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
			if (aCreated !== bCreated) return aCreated - bCreated

			return String(a.id).localeCompare(String(b.id))
		})
		.filter(d => {
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

		// Principal and witness from document_signers (assigned by ENP when adding signers), not from invite/participantRole
		let docPrincipalName = principalName
		let docPrincipalIdNumber = principalIdNumber
		let docPrincipalIdImageBase64 = principalIdImageBase64
		let docPrincipalIdType = principalIdType
		let docPrincipalAddress = principalAddress
		let docWitnessName: string | null = null

		const docSignersForAct = await db.query.documentSigners.findMany({
			where: eq(documentSigners.documentId, doc.id),
			orderBy: [asc(documentSigners.signingOrder)],
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
						address: true,
						homeStreet: true,
						barangay: true,
						cityProvince: true,
					},
				},
			},
		})
		const principalDs = docSignersForAct.find(ds => ds.signerRole === "principal")
		const witnessDs = docSignersForAct.find(ds => ds.signerRole === "witness")
		if (principalDs?.user) {
			docPrincipalName =
				asNonEmptyString(principalDs.signerName) ??
				asNonEmptyString(principalDs.user.name) ??
				asNonEmptyString(principalDs.user.email) ??
				"Principal"
			docPrincipalAddress =
				asNonEmptyString(principalDs.signerAddress) ??
				asNonEmptyString(principalDs.user.address) ??
				(principalDs.user.homeStreet || principalDs.user.barangay || principalDs.user.cityProvince
					? [principalDs.user.homeStreet, principalDs.user.barangay, principalDs.user.cityProvince]
							.filter(Boolean)
							.join(", ")
					: null)
			if (principalDs.userId) {
				const idCard = await db.query.idCardDetails.findFirst({
					where: eq(idCardDetails.userId, principalDs.userId),
					orderBy: [desc(idCardDetails.verifiedAt)],
					columns: {
						documentNumber: true,
						faceImageUrl: true,
						documentType: true,
					},
				})
				if (idCard) {
					docPrincipalIdNumber = asNonEmptyString(idCard.documentNumber)
					docPrincipalIdImageBase64 = asNonEmptyString(idCard.faceImageUrl)
					docPrincipalIdType = asNonEmptyString(idCard.documentType)
				}
			}
		}
		if (witnessDs?.user) {
			docWitnessName =
				asNonEmptyString(witnessDs.user.name) ??
				asNonEmptyString(witnessDs.user.email) ??
				null
		}
		if (!docWitnessName) {
			const witnessSigner = signers.find(s =>
				(s.signerRole ?? "").toUpperCase().includes("WITNESS")
			)
			docWitnessName = witnessSigner
				? asNonEmptyString(
						[witnessSigner.firstName, witnessSigner.lastName].filter(Boolean).join(" ") ||
							witnessSigner.email
					)
				: null
		}

		const locationStatement = defaultLocationStatement()
		const [inserted] = await db
			.insert(notarialActs)
			.values({
				notarialBookId: book.id,
				actType,
				documentId: doc.id,
				docoChainProjectUuid: projectUuid,
				principalName: docPrincipalName,
				principalIdNumber: docPrincipalIdNumber ?? undefined,
				principalAddress: docPrincipalAddress ?? undefined,
				principalIdImageBase64: docPrincipalIdImageBase64 ?? undefined,
				principalIdType: docPrincipalIdType ?? undefined,
				witnessName: docWitnessName ?? undefined,
				enpName,
				enpRollNumber: asNonEmptyString(profile?.rollNo),
				executedAt,
				meetingEndedAt: input.meetingEndedAt,
				workflow: "REN",
				locationStatement,
				documentName: doc.name,
				documentDescription: doc.description ?? null,
				signersData: JSON.stringify(signers),
			})
			.returning({ id: notarialActs.id })

		existingProjectUuids.add(projectUuid)
		createdCount += 1

		// Optional: sync new act to Supreme Court when configured (best-effort; do not fail meeting end)
		if (inserted?.id && isSupremeCourtConfigured() && profile?.notaryPublicNumber && profile?.notaryFacilityNumber && profile?.rollNo) {
			try {
				const actRow = await db.query.notarialActs.findFirst({
					where: eq(notarialActs.id, inserted.id),
				})
				if (actRow) {
					let documentFile: Buffer | undefined
					let documentFileName: string | undefined
					if (actRow.documentId) {
						const document = await db.query.documents.findFirst({
							where: eq(documents.id, actRow.documentId),
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
						act: actRow,
						notaryFacilityNumber: profile.notaryFacilityNumber,
						notaryPublicNumber: profile.notaryPublicNumber,
						rollNumber: profile.rollNo,
						documentFile,
						documentFileName,
					})
					await db
						.update(notarialActs)
						.set({
							syncedToSupremeCourt: true,
							syncedAt: new Date(),
							supremeCourtRegistryId: result.notarialRegistryID,
						})
						.where(eq(notarialActs.id, inserted.id))
				}
			} catch (scError) {
				console.warn("⚠️ Supreme Court sync skipped for new act:", scError)
			}
		}
	}

	return { createdCount, skippedCount }
}

