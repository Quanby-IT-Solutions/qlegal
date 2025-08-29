import { relations, sql, type InferSelectModel } from "drizzle-orm"
import { index, pgEnum, pgTableCreator, primaryKey, text } from "drizzle-orm/pg-core"

import type { AdapterAccount } from "@/services/drizzle/types/auth"

export const createTable = pgTableCreator(name => name)

export const userRoles = pgEnum("user_roles", ["client", "admin", "super_admin"])

export const users = createTable("user", f => ({
	id: f
		.text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: f.text("name"),
	email: f.text("email").unique(),
	emailVerified: f
		.timestamp("email_verified", { mode: "date", withTimezone: true })
		.default(sql`CURRENT_TIMESTAMP`),
	image: f.text("image"),
	password: f.text("password").notNull(),
	phoneNumber: f.text("phone_number"),
	role: userRoles("role").default("client").notNull(),
})).enableRLS()

export const userRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
}))

export const accounts = createTable(
	"account",
	f => ({
		userId: f
			.text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccount["type"]>().notNull(),
		provider: f.text("provider").notNull(),
		providerAccountId: f.text("providerAccountId").notNull(),
		refresh_token: f.text("refresh_token"),
		access_token: f.text("access_token"),
		expires_at: f.integer("expires_at"),
		token_type: f.text("token_type"),
		scope: f.text("scope"),
		id_token: f.text("id_token"),
		session_state: f.text("session_state"),
	}),
	c => [
		primaryKey({ columns: [c.provider, c.providerAccountId] }),
		index("account_user_id_idx").on(c.userId),
	]
).enableRLS()

export const sessions = createTable("session", f => ({
	sessionToken: f.text("sessionToken").primaryKey(),
	userId: f
		.text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: f.timestamp("expires", { mode: "date" }).notNull(),
})).enableRLS()

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const verificationTokens = createTable(
	"verification_token",
	f => ({
		identifier: f.text("identifier").notNull(),
		token: f.text("token").notNull(),
		expires: f.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	c => [primaryKey({ columns: [c.identifier, c.token] })]
).enableRLS()

export type UserRole = InferSelectModel<typeof users>["role"]
export type User = InferSelectModel<typeof users>
export type Account = InferSelectModel<typeof accounts>
export type Session = InferSelectModel<typeof sessions>
export type VerificationToken = InferSelectModel<typeof verificationTokens>
