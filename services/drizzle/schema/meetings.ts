import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import {
	meetingParticipantRole,
	meetingParticipantStatus,
	meetingStatus,
} from "@/services/drizzle/schema/_enums"
import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const meetings = createTable(
	"meeting",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		title: t.varchar({ length: 255 }).notNull(),
		roomId: t.varchar({ length: 255 }).notNull(), // VideoSDK room ID
		status: meetingStatus("status").default("SCHEDULED").notNull(),
		isDocumentOrderLocked: t.boolean().default(false).notNull(), // Document signing order lock
		createdById: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("meetings_room_id_idx").on(t.roomId),
		index("meetings_created_by_idx").on(t.createdById),
	]
).enableRLS()

export const meetingParticipants = createTable(
	"meeting_participant",
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
		// Used for invite flow: host adds row as PENDING, user accepts -> ACCEPTED
		status: meetingParticipantStatus("status").default("ACCEPTED").notNull(),
		// Optional: who invited this participant (typically the host)
		invitedById: t.varchar({ length: 255 }).references(() => users.id, { onDelete: "set null" }),
		// Role in this meeting: PRINCIPAL (default) or WITNESS (set when invited as witness from lobby)
		participantRole: meetingParticipantRole("participant_role").default("PRINCIPAL").notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("meeting_participants_meeting_id_idx").on(t.meetingId),
		index("meeting_participants_user_id_idx").on(t.userId),
		index("meeting_participants_status_idx").on(t.status),
	]
).enableRLS()

export type Meeting = InferSelectModel<typeof meetings>
export type MeetingParticipant = InferSelectModel<typeof meetingParticipants>
