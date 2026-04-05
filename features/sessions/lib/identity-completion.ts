import { and, eq } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { livenessValidations } from "@/services/drizzle/schema/liveness"
import { meetingParticipantIdentityChecks } from "@/services/drizzle/schema/meeting-participant-identity-checks"
import { savedIds } from "@/services/drizzle/schema/saved-ids"

/**
 * Check whether all 3 identity checks are complete for a participant.
 * If livenessValidationId is not yet linked in the identity check row, looks it up from
 * the liveness_validations table and auto-populates it (bridges Ticket 06 dependency).
 * Sets isComplete = true with snapshot fields when all three checks are present.
 */
export async function checkIdentityCompletion(meetingId: string, userId: string): Promise<void> {
	let row = await db.query.meetingParticipantIdentityChecks.findFirst({
		where: and(
			eq(meetingParticipantIdentityChecks.meetingId, meetingId),
			eq(meetingParticipantIdentityChecks.userId, userId)
		),
	})

	if (!row) return

	// Auto-populate livenessValidationId if not yet set (bridges Ticket 06)
	if (!row.livenessValidationId) {
		const livenessRow = await db.query.livenessValidations.findFirst({
			where: and(
				eq(livenessValidations.userId, userId),
				eq(livenessValidations.meetingId, meetingId),
				eq(livenessValidations.status, "pass")
			),
			orderBy: (t, { desc }) => [desc(t.createdAt)],
		})

		if (livenessRow) {
			await db
				.update(meetingParticipantIdentityChecks)
				.set({ livenessValidationId: livenessRow.id })
				.where(
					and(
						eq(meetingParticipantIdentityChecks.meetingId, meetingId),
						eq(meetingParticipantIdentityChecks.userId, userId)
					)
				)
			row = { ...row, livenessValidationId: livenessRow.id }
		}
	}

	const allPresent = !!row.livenessValidationId && !!row.locationVerifiedAt && !!row.savedIdId

	if (!allPresent || row.isComplete) return

	const savedId = row.savedIdId
		? await db.query.savedIds.findFirst({
				where: eq(savedIds.id, row.savedIdId),
			})
		: null

	await db
		.update(meetingParticipantIdentityChecks)
		.set({
			isComplete: true,
			completedAt: new Date(),
			...(savedId
				? {
						snapshotDocumentType: savedId.documentType,
						snapshotDocumentNumber: savedId.documentNumber,
						snapshotFullName: savedId.fullName,
						snapshotFrontImageUrl: savedId.frontImageUrl,
						snapshotExpiresAt: savedId.expiresAt,
					}
				: {}),
		})
		.where(
			and(
				eq(meetingParticipantIdentityChecks.meetingId, meetingId),
				eq(meetingParticipantIdentityChecks.userId, userId)
			)
		)
}
