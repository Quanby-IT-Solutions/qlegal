import { type InferSelectModel } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const enpProfiles = createTable("enp_profile", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	specialization: t.text(), // e.g., "Legal Documents, Contracts, Real Estate"
	bio: t.text(),
	experience: t.varchar({ length: 255 }), // e.g., "5+ years"
	languages: t.text(), // JSON array stored as text, e.g., '["English", "Filipino"]'
	responseTime: t.varchar({ length: 255 }), // e.g., "Within 2 hours"
	rating: t.real().default(0), // Average rating
	reviewCount: t.integer().default(0), // Total number of reviews
	commission: t.real().default(0), // Commission rate for the ENP
	isAvailable: t.boolean().default(true), // Whether accepting new consultations
	createdAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()

export const enpAvailability = createTable("enp_availability", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	enpId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	dayOfWeek: t.integer().notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	startTime: t.varchar({ length: 5 }).notNull(), // e.g., "09:00"
	endTime: t.varchar({ length: 5 }).notNull(), // e.g., "17:00"
	isAvailable: t.boolean().default(true),
	createdAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()

export type EnpProfile = InferSelectModel<typeof enpProfiles>
export type EnpAvailability = InferSelectModel<typeof enpAvailability>

