import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { randomId } from "@/services/drizzle/utils"

// Conversations table
export const conversations = pgTable(
	"conversation",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		updatedAtIdx: index("conversation_updated_at_idx").on(table.updatedAt),
	})
)

// Conversation participants (for 1-on-1 or group chats)
export const conversationParticipants = pgTable(
	"conversation_participant",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		conversationId: varchar("conversation_id", { length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
		lastReadAt: timestamp("last_read_at", { withTimezone: true }),
	},
	(table) => ({
		conversationIdIdx: index("conversation_participant_conversation_id_idx").on(table.conversationId),
		userIdIdx: index("conversation_participant_user_id_idx").on(table.userId),
	})
)

// Messages table
export const messages = pgTable(
	"message",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		conversationId: varchar("conversation_id", { length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		senderId: varchar("sender_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("message_conversation_id_idx").on(table.conversationId),
		createdAtIdx: index("message_created_at_idx").on(table.createdAt),
	})
)

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
	participants: many(conversationParticipants),
	messages: many(messages),
}))

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
	conversation: one(conversations, {
		fields: [conversationParticipants.conversationId],
		references: [conversations.id],
	}),
	user: one(users, {
		fields: [conversationParticipants.userId],
		references: [users.id],
	}),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	sender: one(users, {
		fields: [messages.senderId],
		references: [users.id],
	}),
}))

