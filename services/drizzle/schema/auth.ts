import { relations, type InferSelectModel } from "drizzle-orm"
import { index, pgEnum, primaryKey } from "drizzle-orm/pg-core"

import { envelopes } from "@/services/drizzle/schema/envelope"
import type { AdapterAccount } from "@/services/drizzle/types/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const userRoles = pgEnum("user_roles", ["client", "admin", "super_admin"])

export const users = createTable("user", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	name: t.varchar({ length: 255 }),
	email: t.varchar({ length: 255 }).unique(),
	emailVerified: t.timestamp({ mode: "date", withTimezone: true }),
	image: t.text(),
	password: t.text(),
	isTwoFactorEnabled: t.boolean().default(false),
	phoneNumber: t.varchar({ length: 255 }),
	role: userRoles().default("client").notNull(),
})).enableRLS()

export const userRelations = relations(users, ({ many }) => ({
	// accounts: many(accounts),
	envelopes: many(envelopes),
	// 	twoFactorTokens: many(twoFactorTokens),
	// 	twoFactorConfirmations: one(twoFactorConfirmations, {
	// 		fields: [users.id],
	// 		references: [twoFactorConfirmations.userId],
	// 	}),
	// 	passwordResetTokens: many(passwordResetTokens),
	// 	verificationTokens: many(verificationTokens),
}))

export const accounts = createTable(
	"account",
	t => ({
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: t.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: t.varchar({ length: 255 }).notNull(),
		providerAccountId: t.varchar({ length: 255 }).notNull(),
		refreshToken: t.text(),
		accessToken: t.text(),
		expiresAt: t.integer(),
		tokenType: t.varchar({ length: 255 }),
		scope: t.varchar({ length: 255 }),
		idToken: t.text(),
		sessionState: t.varchar({ length: 255 }),
	}),
	table => [
		primaryKey({ columns: [table.provider, table.providerAccountId] }),
		index("account_user_id_idx").on(table.userId),
	]
).enableRLS()

// export const accountsRelations = relations(accounts, ({ one }) => ({
// 	user: one(users, { fields: [accounts.userId], references: [users.id] }),
// }))

export const sessions = createTable("session", t => ({
	sessionToken: t.varchar({ length: 255 }).primaryKey(),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: t.timestamp({ mode: "date" }).notNull(),
})).enableRLS()

// export const sessionsRelations = relations(sessions, ({ one }) => ({
// 	user: one(users, { fields: [sessions.userId], references: [users.id] }),
// }))

export const passwordResetTokens = createTable("password_reset_token", t => ({
	id: t.varchar({ length: 255 }).notNull().default(randomId()).primaryKey(),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

// export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
// 	user: one(users, { fields: [passwordResetTokens.email], references: [users.email] }),
// }))

export const twoFactorTokens = createTable("two_factor_token", t => ({
	id: t.varchar({ length: 255 }).notNull().default(randomId()).primaryKey(),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

// export const twoFactorTokensRelations = relations(twoFactorTokens, ({ one }) => ({
// 	user: one(users, { fields: [twoFactorTokens.email], references: [users.email] }),
// }))

export const twoFactorConfirmations = createTable("two_factor_confirmation", t => ({
	id: t.varchar({ length: 255 }).notNull().default(randomId()).primaryKey(),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
})).enableRLS()

// export const twoFactorConfirmationsRelations = relations(twoFactorConfirmations, ({ one }) => ({
// 	user: one(users, { fields: [twoFactorConfirmations.userId], references: [users.id] }),
// }))

export const verificationTokens = createTable("verification_token", t => ({
	id: t.varchar({ length: 255 }).notNull().default(randomId()).primaryKey(),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

// export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
// 	user: one(users, { fields: [verificationTokens.email], references: [users.email] }),
// }))

export type UserRole = InferSelectModel<typeof users>["role"]
export type User = InferSelectModel<typeof users>
export type Account = InferSelectModel<typeof accounts>
export type Session = InferSelectModel<typeof sessions>
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>
export type TwoFactorToken = InferSelectModel<typeof twoFactorTokens>
export type VerificationToken = InferSelectModel<typeof verificationTokens>
