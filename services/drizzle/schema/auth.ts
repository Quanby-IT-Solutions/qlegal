import { relations, sql, type InferSelectModel } from "drizzle-orm"
import { index, pgEnum, primaryKey, text } from "drizzle-orm/pg-core"

import { envelopes } from "@/services/drizzle/schema/envelope"
import type { AdapterAccount } from "@/services/drizzle/types/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const userRoles = pgEnum("user_roles", ["client", "admin", "super_admin"])

export const users = createTable("user", f => ({
	id: f
		.text("id")
		.primaryKey()
		.$defaultFn(() => randomId()),
	name: f.text("name"),
	email: f.text("email").unique(),
	emailVerified: f
		.timestamp("email_verified", { mode: "date", withTimezone: true })
		.default(sql`CURRENT_TIMESTAMP`),
	image: f.text("image"),
	password: f.text("password").notNull(),
	isTwoFactorEnabled: f.boolean("is_two_factor_enabled").default(false),
	phoneNumber: f.text("phone_number"),
	role: userRoles("role").default("client").notNull(),
})).enableRLS()

export const userRelations = relations(users, ({ one, many }) => ({
	accounts: many(accounts),
	envelopes: many(envelopes),
	twoFactorTokens: many(twoFactorTokens),
	twoFactorConfirmations: one(twoFactorConfirmations, {
		fields: [users.id],
		references: [twoFactorConfirmations.userId],
	}),
	passwordResetTokens: many(passwordResetTokens),
	verificationTokens: many(verificationTokens),
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

export const passwordResetTokens = createTable("password_reset_token", f => ({
	id: f.text("id").notNull().default(randomId()).primaryKey(),
	email: f
		.text("email")
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: f.text("token").notNull(),
	expires: f.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
	user: one(users, { fields: [passwordResetTokens.email], references: [users.email] }),
}))

export const twoFactorTokens = createTable("two_factor_token", f => ({
	id: f.text("id").notNull().default(randomId()).primaryKey(),
	email: f
		.text("email")
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: f.text("token").notNull(),
	expires: f.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export const twoFactorTokensRelations = relations(twoFactorTokens, ({ one }) => ({
	user: one(users, { fields: [twoFactorTokens.email], references: [users.email] }),
}))

export const twoFactorConfirmations = createTable("two_factor_confirmation", f => ({
	id: f.text("id").notNull().default(randomId()).primaryKey(),
	userId: f
		.text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
})).enableRLS()

export const twoFactorConfirmationsRelations = relations(twoFactorConfirmations, ({ one }) => ({
	user: one(users, { fields: [twoFactorConfirmations.userId], references: [users.id] }),
}))

export const verificationTokens = createTable("verification_token", f => ({
	id: f.text("id").notNull().default(randomId()).primaryKey(),
	email: f
		.text("email")
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: f.text("token").notNull(),
	expires: f.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
	user: one(users, { fields: [verificationTokens.email], references: [users.email] }),
}))

export type UserRole = InferSelectModel<typeof users>["role"]
export type User = InferSelectModel<typeof users>
export type Account = InferSelectModel<typeof accounts>
export type Session = InferSelectModel<typeof sessions>
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>
export type TwoFactorToken = InferSelectModel<typeof twoFactorTokens>
export type VerificationToken = InferSelectModel<typeof verificationTokens>
