import { relations } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const envelopes = createTable("envelopes", f => ({
	id: f
		.text("id")
		.primaryKey()
		.$defaultFn(() => randomId()),
	token: f
		.text("token")
		.unique()
		.notNull()
		.$defaultFn(() => randomId()),
	title: f.text("title").notNull(),
	description: f.text("description"),
	status: f
		.text("status", {
			enum: ["DRAFT", "PUBLISHED", "COMPLETED", "PENDING_APPROVAL", "APPROVED", "REJECTED"],
		})
		.default("DRAFT")
		.notNull(),
	createdAt: f.timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: f
		.timestamp("updated_at", { mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
	// Relations
	userId: f
		.text("user_id")
		.notNull()
		.references(() => users.id),
})).enableRLS()

export const envelopeRelations = relations(envelopes, ({ one }) => ({
	user: one(users, {
		fields: [envelopes.userId],
		references: [users.id],
	}),
}))
