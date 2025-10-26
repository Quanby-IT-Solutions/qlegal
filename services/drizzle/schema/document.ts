import { documentStatusEnum } from "@/services/drizzle/schema/_enums"
import { envelopes } from "@/services/drizzle/schema/envelope"
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
	path: t.varchar({ length: 255 }).notNull(), // Storage path
	status: documentStatusEnum("status").default("UPLOADED").notNull(),
	envelopeId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => envelopes.id),
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()
