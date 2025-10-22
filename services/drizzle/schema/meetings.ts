import { relations, type InferSelectModel } from "drizzle-orm"
import { index, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { randomId } from "@/services/drizzle/utils"

// Meeting status enum
export const meetingStatus = pgEnum("meeting_status", ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"])

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
	(table) => ({
		roomIdIdx: index("meetings_room_id_idx").on(table.roomId),
		createdByIdx: index("meetings_created_by_idx").on(table.createdById),
	})
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
	(table) => ({
		meetingIdIdx: index("meeting_participants_meeting_id_idx").on(table.meetingId),
		userIdIdx: index("meeting_participants_user_id_idx").on(table.userId),
	})
)

// Relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [meetings.createdById],
		references: [users.id],
	}),
	participants: many(meetingParticipants),
}))

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
	meeting: one(meetings, {
		fields: [meetingParticipants.meetingId],
		references: [meetings.id],
	}),
	user: one(users, {
		fields: [meetingParticipants.userId],
		references: [users.id],
	}),
}))

// Types
export type Meeting = InferSelectModel<typeof meetings>
export type MeetingParticipant = InferSelectModel<typeof meetingParticipants>

