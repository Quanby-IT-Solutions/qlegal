import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { conversations } from "@/services/drizzle/schema/messages"
import { createTable, randomId } from "@/services/drizzle/utils"

export const messageAttachments = createTable(
	"message_attachment",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		conversationId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		uploadedBy: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		fileName: t.varchar({ length: 255 }).notNull(),
		fileSize: t.integer().notNull(), // in bytes
		fileType: t.varchar({ length: 100 }).notNull(),
		filePath: t.text().notNull(), // Path in Supabase storage
		fileUrl: t.text(), // Public URL (if applicable)
		uploadType: t.varchar({ length: 50 }).notNull().default("general"), // 'general', 'principal', 'enp'
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("message_attachment_conversation_id_idx").on(t.conversationId),
		index("message_attachment_upload_type_idx").on(t.uploadType),
		index("message_attachment_created_at_idx").on(t.createdAt),
	]
).enableRLS()
