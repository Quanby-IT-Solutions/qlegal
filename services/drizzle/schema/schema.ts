import { relations } from "drizzle-orm"
import { boolean, index, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"

// Import auth tables
import { users } from "./auth"

// Core Enums Only
export const envelopeStatusEnum = pgEnum("envelope_status", [
	"DRAFT",
	"PUBLISHED",
	"COMPLETED",
	"CANCELLED",
	"EXPIRED",
	"PENDING_APPROVAL",
	"APPROVED",
	"REJECTED",
])

export const recipientRoleEnum = pgEnum("recipient_role", ["SIGNER", "VIEWER", "APPROVER", "CC"])

export const recipientStatusEnum = pgEnum("recipient_status", [
	"PENDING",
	"REQUESTED",
	"PUBLISHED",
	"VIEWED",
	"SIGNED",
	"DECLINED",
	"EXPIRED",
	"APPROVED",
	"REJECTED",
])

export const documentStatusEnum = pgEnum("document_status", [
	"PENDING",
	"PROCESSING",
	"READY",
	"SIGNED",
	"COMPLETED",
	"ERROR",
])

export const auditEventTypeEnum = pgEnum("audit_event_type", [
	"ENVELOPE_CREATED",
	"ENVELOPE_PUBLISHED",
	"ENVELOPE_VIEWED",
	"ENVELOPE_COMPLETED",
	"ENVELOPE_CANCELLED",
	"ENVELOPE_EXPIRED",
	"ENVELOPE_PENDING_APPROVAL",
	"ENVELOPE_APPROVED",
	"ENVELOPE_REJECTED",
	"DOCUMENT_UPLOADED",
	"DOCUMENT_VIEWED",
	"DOCUMENT_SIGNED",
	"RECIPIENT_ADDED",
	"RECIPIENT_REMOVED",
	"RECIPIENT_VIEWED",
	"RECIPIENT_SIGNED",
	"RECIPIENT_DECLINED",
	"REMINDER_SENT",
	"SETTINGS_UPDATED",
])

// Core Tables Only
export const envelopes = pgTable(
	"envelopes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		token: text("token")
			.unique()
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		title: text("title").notNull(),
		description: text("description"),
		status: envelopeStatusEnum("status").default("PUBLISHED").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
	},
	table => ({
		statusIdx: index("envelopes_status_idx").on(table.status),
		userIdIdx: index("envelopes_user_id_idx").on(table.userId),
	})
).enableRLS()

export const documents = pgTable(
	"documents",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		type: text("type").notNull(),
		size: text("size").notNull(), // Changed to text to handle large numbers
		path: text("path").notNull(),
		status: documentStatusEnum("status").default("PENDING"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		envelopeId: text("envelope_id")
			.notNull()
			.references(() => envelopes.id, { onDelete: "cascade" }),
	},
	table => ({
		envelopeIdIdx: index("documents_envelope_id_idx").on(table.envelopeId),
		statusIdx: index("documents_status_idx").on(table.status),
	})
).enableRLS()

export const recipients = pgTable(
	"recipients",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		role: recipientRoleEnum("role").notNull(),
		status: recipientStatusEnum("status").notNull(),
		// For registered users
		userId: text("user_id").references(() => users.id),
		// For non-registered recipients
		email: text("email"),
		name: text("name"),
		// Relations
		envelopeId: text("envelope_id")
			.notNull()
			.references(() => envelopes.id, { onDelete: "cascade" }),
		documentId: text("document_id").references(() => documents.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	table => ({
		envelopeIdIdx: index("recipients_envelope_id_idx").on(table.envelopeId),
		documentIdIdx: index("recipients_document_id_idx").on(table.documentId),
		userIdIdx: index("recipients_user_id_idx").on(table.userId),
		emailIdx: index("recipients_email_idx").on(table.email),
	})
).enableRLS()

export const auditEvents = pgTable(
	"audit_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		eventType: auditEventTypeEnum("event_type").notNull(),
		description: text("description").notNull(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		userEmail: text("user_email"),
		userName: text("user_name"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		metadata: json("metadata"),
		// Relations
		envelopeId: text("envelope_id").references(() => envelopes.id, { onDelete: "cascade" }),
		documentId: text("document_id").references(() => documents.id, { onDelete: "cascade" }),
		recipientId: text("recipient_id").references(() => recipients.id, { onDelete: "cascade" }),
	},
	table => ({
		envelopeIdIdx: index("audit_events_envelope_id_idx").on(table.envelopeId),
		documentIdIdx: index("audit_events_document_id_idx").on(table.documentId),
		recipientIdIdx: index("audit_events_recipient_id_idx").on(table.recipientId),
		eventTypeIdx: index("audit_events_event_type_idx").on(table.eventType),
		timestampIdx: index("audit_events_timestamp_idx").on(table.timestamp),
	})
).enableRLS()

export const twoFactorCodes = pgTable(
	"two_factor_codes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		code: text("code").notNull(),
		expires: timestamp("expires").notNull(),
		used: boolean("used").default(false).notNull(),
		purpose: text("purpose").default("TWO_FACTOR"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	table => ({
		userIdIdx: index("two_factor_codes_user_id_idx").on(table.userId),
		codeIdx: index("two_factor_codes_code_idx").on(table.code),
	})
).enableRLS()

// Core Relations Only
export const usersRelations = relations(users, ({ many }) => ({
	envelopes: many(envelopes),
	recipients: many(recipients),
	twoFactorCodes: many(twoFactorCodes),
}))

export const envelopesRelations = relations(envelopes, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [envelopes.userId],
		references: [users.id],
	}),
	documents: many(documents),
	recipients: many(recipients),
	auditEvents: many(auditEvents),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
	envelope: one(envelopes, {
		fields: [documents.envelopeId],
		references: [envelopes.id],
	}),
	recipients: many(recipients),
	auditEvents: many(auditEvents),
}))

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
	user: one(users, {
		fields: [recipients.userId],
		references: [users.id],
	}),
	envelope: one(envelopes, {
		fields: [recipients.envelopeId],
		references: [envelopes.id],
	}),
	document: one(documents, {
		fields: [recipients.documentId],
		references: [documents.id],
	}),
	auditEvents: many(auditEvents),
}))

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
	envelope: one(envelopes, {
		fields: [auditEvents.envelopeId],
		references: [envelopes.id],
	}),
	document: one(documents, {
		fields: [auditEvents.documentId],
		references: [documents.id],
	}),
	recipient: one(recipients, {
		fields: [auditEvents.recipientId],
		references: [recipients.id],
	}),
}))

export const twoFactorCodesRelations = relations(twoFactorCodes, ({ one }) => ({
	user: one(users, {
		fields: [twoFactorCodes.userId],
		references: [users.id],
	}),
}))

// Export auth tables for consistency
export { users } from "./auth"
