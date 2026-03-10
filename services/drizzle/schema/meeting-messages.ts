import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { meetings } from "@/services/drizzle/schema/meetings"
import { createTable, randomId } from "@/services/drizzle/utils"

/** In-meeting chat messages. Deleted when the session is ended (endMeeting). */
export const meetingMessages = createTable(
	"meeting_message",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		meetingId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		senderId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		content: t.text().notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("meeting_message_meeting_id_idx").on(t.meetingId),
		index("meeting_message_created_at_idx").on(t.createdAt),
	]
).enableRLS()

export type MeetingMessage = InferSelectModel<typeof meetingMessages>
