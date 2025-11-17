import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { legalApplicationStatus } from "@/services/drizzle/schema/_enums"
import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const legalRegistrations = createTable(
	"legal_registration",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		applicantId: t
			.varchar({ length: 255 })
			.notNull()
			.unique()
			.references(() => users.id, { onDelete: "cascade" }),
		status: legalApplicationStatus().default("DRAFT").notNull(),

		// Personal Qualifications
		citizenship: t.varchar({ length: 255 }).notNull(),
		dateOfBirth: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
		residentialAddress: t.text().notNull(),
		workOrBusinessAddress: t.text().notNull(),
		telephoneNumber: t.varchar({ length: 50 }),
		mobileNumber: t.varchar({ length: 50 }).notNull(),
		emailAddress: t.varchar({ length: 255 }).notNull(),
		professionalTaxReceiptNumber: t.varchar({ length: 255 }).notNull(),
		rollOfAttorneysNumber: t.varchar({ length: 255 }).notNull(),
		ibpMembershipNumber: t.varchar({ length: 255 }).notNull(),
		mcleComplianceNumber: t.varchar({ length: 255 }).notNull(),
		ulasComplianceNumber: t.varchar({ length: 255 }).notNull(),

		// Required Documents (file references)
		obcCertificationUrl: t.text().notNull(),
		ibpCertificationUrl: t.text().notNull(),
		passportPhotoUrl: t.text().notNull(),
		paymentProofUrl: t.text().notNull(),
		enfProviderCertificationUrl: t.text().notNull(),

		// Undertakings
		undertakingElectronicNotarialActs: t.boolean().default(false).notNull(),
		undertakingDataSharingGuidelines: t.boolean().default(false).notNull(),

		// Electronic Signature
		electronicSignatureApplied: t.boolean().default(false).notNull(),
		electronicSignatureUrl: t.text(),

		// Timestamps
		submittedAt: t.timestamp({ mode: "date", withTimezone: true }),
		reviewedAt: t.timestamp({ mode: "date", withTimezone: true }),
		approvedAt: t.timestamp({ mode: "date", withTimezone: true }),
		rejectedAt: t.timestamp({ mode: "date", withTimezone: true }),

		// Review information
		reviewedBy: t.varchar({ length: 255 }),
		remarks: t.text(),

		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		index("legal_registration_status_idx").on(t.status),
		index("legal_registration_applicant_id_idx").on(t.applicantId),
	]
).enableRLS()

export type LegalRegistration = InferSelectModel<typeof legalRegistrations>
