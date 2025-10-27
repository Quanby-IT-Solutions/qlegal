import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const conversations = createTable(
	"conversation",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [index("conversation_updated_at_idx").on(t.updatedAt)]
).enableRLS()

export const conversationParticipants = createTable(
	"conversation_participant",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		conversationId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		joinedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		lastReadAt: t.timestamp({ mode: "date", withTimezone: true }),
	}),
	t => [
		index("conversation_participant_conversation_id_idx").on(t.conversationId),
		index("conversation_participant_user_id_idx").on(t.userId),
	]
).enableRLS()

export const messages = createTable(
	"message",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		conversationId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		senderId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		content: t.text().notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("message_conversation_id_idx").on(t.conversationId),
		index("message_created_at_idx").on(t.createdAt),
	]
).enableRLS()
