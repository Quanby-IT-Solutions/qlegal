import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { meetingStatus } from "@/services/drizzle/schema/_enums"
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
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("meeting_participants_meeting_id_idx").on(t.meetingId),
		index("meeting_participants_user_id_idx").on(t.userId),
	]
).enableRLS()

export type Meeting = InferSelectModel<typeof meetings>
export type MeetingParticipant = InferSelectModel<typeof meetingParticipants>
