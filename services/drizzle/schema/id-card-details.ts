import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { createTable, randomId } from "@/services/drizzle/utils"
import { users } from "./auth"

/**
 * Supported ID document types in the Philippines
 */
export const idDocumentTypeEnum = [
	"NATIONAL_ID",
	"DRIVERS_LICENSE",
	"PASSPORT",
	"VOTERS_ID",
	"UMID",
	"SSS_ID",
	"PHILHEALTH_ID",
	"TIN_ID",
	"POSTAL_ID",
	"PRC_ID",
	"OTHER",
] as const

export type IdDocumentType = (typeof idDocumentTypeEnum)[number]

/**
 * ID Card Details Table
 * Stores structured OCR-extracted information from government-issued ID cards
 * Used for KYC verification and notarial book entries
 */
export const idCardDetails = createTable(
	"id_card_detail",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),

		// Foreign key to user
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// Document type and identification
		documentType: t.varchar({ length: 50 }).notNull(), // NATIONAL_ID, DRIVERS_LICENSE, etc.
		documentNumber: t.varchar({ length: 255 }), // ID card number
		documentCountry: t.varchar({ length: 3 }).default("PHL"), // ISO country code

		// Personal information
		firstName: t.varchar({ length: 255 }),
		middleName: t.varchar({ length: 255 }),
		lastName: t.varchar({ length: 255 }),
		fullName: t.varchar({ length: 500 }), // Full name as it appears on ID
		dateOfBirth: t.varchar({ length: 50 }), // Store as string since OCR may give various formats
		gender: t.varchar({ length: 50 }),
		nationality: t.varchar({ length: 100 }),

		// Address information
		addressLine1: t.text(),
		addressLine2: t.text(),
		city: t.varchar({ length: 255 }),
		province: t.varchar({ length: 255 }),
		postalCode: t.varchar({ length: 20 }),
		country: t.varchar({ length: 100 }),

		// Document validity
		issueDate: t.varchar({ length: 50 }),
		expiryDate: t.varchar({ length: 50 }),
		isExpired: t.boolean().default(false),

		// Additional fields (document-specific)
		// For driver's license: license class, restrictions
		// For passport: passport number, place of issue
		// Stored as JSONB for flexibility
		additionalFields: t.jsonb(),

		// OCR metadata
		ocrConfidenceScore: t.real(), // Overall OCR confidence (0-1)
		ocrProvider: t.varchar({ length: 100 }).default("hyperverge"), // HyperVerge, etc.
		ocrTransactionId: t.varchar({ length: 255 }), // Link back to KYC transaction
		rawOcrData: t.jsonb(), // Store raw OCR response for reference/debugging

		// Document images (stored as base64 data URLs or object storage URLs)
		frontImageUrl: t.text(),
		backImageUrl: t.text(),
		faceImageUrl: t.text(), // Cropped face from ID

		// Verification status
		isVerified: t.boolean().default(false),
		verifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
		verificationMethod: t.varchar({ length: 100 }), // "kyc_mobile_link", "kyc_desktop_camera", etc.

		// Timestamps
		createdAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	table => [
		index("id_card_details_user_id_idx").on(table.userId),
		index("id_card_details_document_number_idx").on(table.documentNumber),
		index("id_card_details_document_type_idx").on(table.documentType),
		index("id_card_details_verified_idx").on(table.isVerified),
	]
).enableRLS()

export type IdCardDetail = InferSelectModel<typeof idCardDetails>
