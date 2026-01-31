import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const enpProfiles = createTable(
	"enp_profile",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.unique()
			.references(() => users.id, { onDelete: "cascade" }),

		// Basic profile info
		specialization: t.text(), // e.g., "Legal Documents, Contracts, Real Estate"
		bio: t.text(),
		experience: t.varchar({ length: 255 }), // e.g., "5+ years"
		languages: t.text(), // JSON array stored as text, e.g., '["English", "Filipino"]'
		responseTime: t.varchar({ length: 255 }), // e.g., "Within 2 hours"
		rating: t.real().default(0), // Average rating
		reviewCount: t.integer().default(0), // Total number of reviews
		commission: t.real().default(0), // Commission rate for ENP
		isAvailable: t.boolean().default(true), // Whether accepting new consultations

		// --- Notary Seal Info ---
		enpName: t.varchar({ length: 255 }), // e.g., "Juan Dela Cruz"
		enpRoleNumber: t.varchar({ length: 100 }), // e.g., "123456"

		// --- Notary Info (Document Stamp) ---
		rollNo: t.varchar({ length: 100 }), // Roll of Attorneys number
		rollNoDate: t.varchar({ length: 100 }), // e.g., "5 June 2018"
		commissionNo: t.varchar({ length: 100 }), // e.g., "2024 - 024"
		commissionNoValidUntil: t.varchar({ length: 100 }), // e.g., "Dec 31, 2025"
		ptrNo: t.varchar({ length: 100 }), // Professional Tax Receipt number
		ptrNoLocation: t.varchar({ length: 255 }), // e.g., "Manila"
		ptrNoDate: t.varchar({ length: 100 }), // e.g., "Jan 02, 2025"
		ibpNo: t.varchar({ length: 100 }), // Integrated Bar of the Philippines number
		ibpNoDate: t.varchar({ length: 100 }), // e.g., "Dec 18, 2024 (for 2025)"
		notaryAddress: t.text(), // Official notary address
		mcleNoPeriod: t.varchar({ length: 50 }), // e.g., "VIII"
		mcleNo: t.varchar({ length: 100 }), // MCLE Compliance number
		mcleNoDate: t.varchar({ length: 100 }), // e.g., "Jun 12, 2024"

		// --- Pricing Information ---
		// Consultation pricing
		consultationPrice: t.real(), // Price per consultation session

		// eNotarization pricing (as per Rules on eNotarization, Rule IV)
		acknowledgmentPrice: t.real(), // Section 1, Rule IV - Acknowledgment by Electronic Means
		affirmationPrice: t.real(), // Section 2, Rule IV - Affirmation or Oath by Electronic Means
		juratPrice: t.real(), // Section 3, Rule IV - Jurat by Electronic Means
		signatureWitnessingPrice: t.real(), // Section 4, Rule IV - Signature Witnessing by Electronic Means

		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [index("enp_profile_user_id_idx").on(t.userId)]
).enableRLS()

export const enpAvailability = createTable("enp_availability", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	enpId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: t.varchar({ length: 50 }).notNull().default("REGULAR"), // 'REGULAR' = weekly recurring availability, 'BLOCKED' = one-time blocked slot, 'CUSTOM' = one-time availability override, 'RECURRING_BLOCKED' = recurring blocked time slots
	date: t.date(), // For BLOCKED and CUSTOM types (null for REGULAR and RECURRING_BLOCKED)
	dayOfWeek: t.integer(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (required for REGULAR and RECURRING_BLOCKED)
	startTime: t.varchar({ length: 5 }).notNull(), // e.g., "09:00"
	endTime: t.varchar({ length: 5 }).notNull(), // e.g., "17:00"
	reason: t.text(), // Optional reason for blocked slot
	isAllDays: t.boolean().default(false), // For RECURRING_BLOCKED - applies to all 7 days of week if true
	isAvailable: t.boolean().default(true),
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
})).enableRLS()

export type EnpProfile = InferSelectModel<typeof enpProfiles>
export type EnpAvailability = InferSelectModel<typeof enpAvailability>
