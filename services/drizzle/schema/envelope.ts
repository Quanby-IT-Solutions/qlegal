import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const envelopes = createTable("envelope", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	token: t
		.varchar({ length: 255 })
		.unique()
		.notNull()
		.$defaultFn(() => randomId()),
	title: t.varchar({ length: 255 }).notNull(),
	description: t.text(),
	status: t.varchar({ length: 255 }).default("DRAFT").notNull(),
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id),
})).enableRLS()
