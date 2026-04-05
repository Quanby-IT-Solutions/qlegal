import { type InferSelectModel } from "drizzle-orm"
import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable, randomId } from "@/services/drizzle/utils"

import { users } from "./auth"
import { livenessValidations } from "./liveness"
import { meetings } from "./meetings"
import { savedIds } from "./saved-ids"

/**
 * Meeting Participant Identity Checks Table
 * Per-session identity state for each participant. One row per (meetingId, userId).
 * Authoritative record of which ID was used for that notarization session.
 */
export const meetingParticipantIdentityChecks = createTable(
	"meeting_participant_identity_check",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),

		meetingId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),

		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		savedIdId: t.varchar({ length: 255 }).references(() => savedIds.id, {
			onDelete: "set null",
		}),

		livenessValidationId: t.varchar({ length: 255 }).references(() => livenessValidations.id, {
			onDelete: "set null",
		}),

		// Location verification
		locationVerifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
		locationLat: t.real(),
		locationLng: t.real(),
		locationAddress: t.text(),
		locationIp: t.varchar({ length: 255 }),
		locationCountryCode: t.varchar({ length: 3 }),

		// Completion status
		isComplete: t.boolean().default(false).notNull(),
		completedAt: t.timestamp({ mode: "date", withTimezone: true }),

		// Immutable audit snapshot from saved_ids at completion time
		snapshotDocumentType: t.varchar({ length: 50 }),
		snapshotDocumentNumber: t.varchar({ length: 255 }),
		snapshotFullName: t.varchar({ length: 500 }),
		snapshotFrontImageUrl: t.text(),
		snapshotExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),

		// Timestamps
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	table => [
		uniqueIndex("mpic_meeting_user_unique").on(table.meetingId, table.userId),
		index("mpic_meeting_id_idx").on(table.meetingId),
		index("mpic_user_id_idx").on(table.userId),
		index("mpic_saved_id_id_idx").on(table.savedIdId),
		index("mpic_is_complete_idx").on(table.isComplete),
	]
).enableRLS()

export type MeetingParticipantIdentityCheck = InferSelectModel<
	typeof meetingParticipantIdentityChecks
>
