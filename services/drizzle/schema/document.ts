import { relations } from "drizzle-orm"
import { pgEnum } from "drizzle-orm/pg-core"

import { envelopes } from "@/services/drizzle/schema/envelope"
import { createTable, randomId } from "@/services/drizzle/utils"

export const documentStatusEnum = pgEnum("document_status", [
	"UPLOADED",
	"PROCESSING",
	"READY",
	"ERROR",
])

export const documents = createTable("documents", f => ({
	id: f
		.text("id")
		.primaryKey()
		.$defaultFn(() => randomId()),
	name: f.text("name").notNull(),
	description: f.text("description"),
	type: f.text("type").notNull(), // MIME type
	size: f.integer("size").notNull(), // File size in bytes
	path: f.text("path").notNull(), // Storage path
	status: documentStatusEnum("status").default("UPLOADED").notNull(),
	envelopeId: f
		.text("envelope_id")
		.notNull()
		.references(() => envelopes.id),
	createdAt: f.timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: f
		.timestamp("updated_at", { mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()

export const documentRelations = relations(documents, ({ one }) => ({
	envelope: one(envelopes, {
		fields: [documents.envelopeId],
		references: [envelopes.id],
	}),
}))
