import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { createTable, randomId } from "@/services/drizzle/utils"

import { users } from "./auth"
import { kycSessions } from "./kyc-sessions"

/**
 * Saved IDs Table
 * Append-only library of KYC-backed identity documents.
 * Each HyperVerge verification run produces one row — no overwrites.
 */
export const savedIds = createTable(
	"saved_id",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),

		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		kycSessionId: t.varchar({ length: 255 }).references(() => kycSessions.id, {
			onDelete: "set null",
		}),

		// Document identification
		documentType: t.varchar({ length: 50 }).notNull(),
		documentNumber: t.varchar({ length: 255 }),
		documentCountry: t.varchar({ length: 3 }).default("PHL"),

		// Personal information (OCR-extracted)
		firstName: t.varchar({ length: 255 }),
		middleName: t.varchar({ length: 255 }),
		lastName: t.varchar({ length: 255 }),
		fullName: t.varchar({ length: 500 }),
		dateOfBirth: t.varchar({ length: 50 }),
		gender: t.varchar({ length: 50 }),

		// Address
		addressLine1: t.text(),
		city: t.varchar({ length: 255 }),
		province: t.varchar({ length: 255 }),
		country: t.varchar({ length: 100 }),

		// Document validity
		issueDate: t.varchar({ length: 50 }),
		expiryDate: t.varchar({ length: 50 }),
		expiresAt: t.timestamp({ mode: "date", withTimezone: true }),
		isExpired: t.boolean().default(false),

		// Document images
		frontImageUrl: t.text(),
		backImageUrl: t.text(),
		faceImageUrl: t.text(),

		// OCR metadata
		ocrConfidenceScore: t.real(),
		ocrTransactionId: t.varchar({ length: 255 }),
		rawOcrData: t.jsonb(),

		// Verification
		isVerified: t.boolean().default(false),
		verifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
		verificationMethod: t.varchar({ length: 100 }),

		// Soft-delete flag
		isActive: t.boolean().default(true),

		// Timestamps
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	table => [
		index("saved_ids_user_id_idx").on(table.userId),
		index("saved_ids_user_id_active_idx").on(table.userId, table.isActive),
		index("saved_ids_expires_at_idx").on(table.expiresAt),
		index("saved_ids_document_type_idx").on(table.documentType),
	]
).enableRLS()

export type SavedId = InferSelectModel<typeof savedIds>
