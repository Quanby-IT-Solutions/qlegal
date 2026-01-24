import { type InferSelectModel } from "drizzle-orm"
import { index, primaryKey } from "drizzle-orm/pg-core"

import { kycStatus, userRoles, userStatus } from "@/services/drizzle/schema/_enums"
import type { AdapterAccount } from "@/services/drizzle/types/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

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
	address: t.text(), // Principal address for document signing records
	role: userRoles().default("PRINCIPAL").notNull(),
	status: userStatus().default("ACTIVE").notNull(),
	// KYC Verification fields
	kycTransactionId: t.varchar({ length: 255 }),
	kycLink: t.text(), // Store the HyperVerge onboard link URL
	kycStatus: kycStatus().default("NOT_STARTED"),
	kycVerifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
	kycLinkCreatedAt: t.timestamp({ mode: "date", withTimezone: true }), // Track when KYC link was created to detect expiration
	// Liveness Verification fields
	livenessVerified: t.boolean().default(false),
	livenessVerifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
	livenessTransactionId: t.varchar({ length: 255 }),
})).enableRLS()

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

export const sessions = createTable("session", t => ({
	sessionToken: t.varchar({ length: 255 }).primaryKey(),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: t.timestamp({ mode: "date" }).notNull(),
})).enableRLS()

export const passwordResetTokens = createTable("password_reset_token", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export const twoFactorTokens = createTable("two_factor_token", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export const twoFactorConfirmations = createTable("two_factor_confirmation", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
})).enableRLS()

export const verificationTokens = createTable("verification_token", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	email: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.email, { onDelete: "cascade" }),
	token: t.varchar({ length: 255 }).notNull(),
	expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
})).enableRLS()

export type UserRole = InferSelectModel<typeof users>["role"]
export type User = InferSelectModel<typeof users>
export type Account = InferSelectModel<typeof accounts>
export type Session = InferSelectModel<typeof sessions>
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>
export type TwoFactorToken = InferSelectModel<typeof twoFactorTokens>
export type VerificationToken = InferSelectModel<typeof verificationTokens>
