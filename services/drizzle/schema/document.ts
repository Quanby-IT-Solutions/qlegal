import { documentStatusEnum } from "@/services/drizzle/schema/_enums"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetings } from "@/services/drizzle/schema/meetings"
import { createTable, randomId } from "@/services/drizzle/utils"

export const documents = createTable("document", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	name: t.varchar({ length: 255 }).notNull(),
	description: t.text(),
	type: t.varchar({ length: 255 }).notNull(), // MIME type
	size: t.integer().notNull(), // File size in bytes
	path: t.varchar({ length: 255 }).default(""), // Storage path - can be empty initially
	status: documentStatusEnum("status").default("UPLOADED").notNull(),
	docoChainProjectId: t.varchar({ length: 255 }), // DocoChain project UUID
	docoChainRedirectUrl: t.text(), // DocoChain redirect URL with auth token
	envelopeId: t
		.varchar({ length: 255 })
		.references(() => envelopes.id),
	meetingId: t
		.varchar({ length: 255 })
		.references(() => meetings.id, { onDelete: "cascade" }),
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()
