import { type InferSelectModel } from "drizzle-orm"
import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core"

import { meetingStatus } from "@/services/drizzle/schema/_enums"
import { users } from "@/services/drizzle/schema/auth"
import { randomId } from "@/services/drizzle/utils"

// Simple meetings table
export const meetings = pgTable(
	"meetings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		title: varchar("title", { length: 255 }).notNull(),
		roomId: varchar("room_id", { length: 255 }).notNull(), // VideoSDK room ID
		status: meetingStatus("status").default("SCHEDULED").notNull(),
		createdById: varchar("created_by_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	table => [
		index("meetings_room_id_idx").on(table.roomId),
		index("meetings_created_by_idx").on(table.createdById),
	]
)

// Meeting participants
export const meetingParticipants = pgTable(
	"meeting_participants",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		meetingId: varchar("meeting_id", { length: 255 })
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	table => [
		index("meeting_participants_meeting_id_idx").on(table.meetingId),
		index("meeting_participants_user_id_idx").on(table.userId),
	]
)

// Types
export type Meeting = InferSelectModel<typeof meetings>
export type MeetingParticipant = InferSelectModel<typeof meetingParticipants>
