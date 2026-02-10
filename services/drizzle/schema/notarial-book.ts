import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { createTable, randomId } from "@/services/drizzle/utils"

// Notarial act types per Supreme Court requirements
export const notarialActTypeEnum = (name: string) => ({
	[name]: ["ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"] as const,
})

// Notarial Book - One per ENP per ENF
export const notarialBooks = createTable(
	"notarial_book",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		enpId: t
			.varchar({ length: 255 })
			.references(() => users.id)
			.notNull(),
		enfId: t.varchar({ length: 255 }), // ENF Provider ID (if applicable)
		syncedToSupremeCourt: t.boolean().default(false),
		syncedAt: t.timestamp({ mode: "date", withTimezone: true }),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		// Index for efficient lookup of notarial book by ENP
		index("notarial_book_enp_id_idx").on(t.enpId),
	]
).enableRLS()

// Notarial Act - Individual entries in the notarial book
export const notarialActs = createTable(
	"notarial_act",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		notarialBookId: t
			.varchar({ length: 255 })
			.references(() => notarialBooks.id)
			.notNull(),
		actType: t.varchar({ length: 50 }).notNull(), // ACKNOWLEDGMENT, AFFIRMATION, JURAT, SIGNATURE_WITNESSING
		documentId: t.varchar({ length: 255 }).references(() => documents.id),
		docoChainProjectUuid: t.varchar({ length: 255 }), // DocoChain project UUID for passport data

		// Principal information
		principalName: t.varchar({ length: 255 }).notNull(),
		principalIdNumber: t.varchar({ length: 255 }),
		principalAddress: t.text(),
		principalIdImageBase64: t.text(), // Base64 image of principal's ID from KYC
		principalIdType: t.varchar({ length: 100 }), // OCR document type (e.g., "Driver's License", "National ID", "Passport")

		// Witness information (if applicable)
		witnessName: t.varchar({ length: 255 }),
		witnessIdNumber: t.varchar({ length: 255 }),

		// ENP information
		enpName: t.varchar({ length: 255 }).notNull(),
		enpRollNumber: t.varchar({ length: 255 }),

		// Execution details
		executedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(), // When document was signed completed (from signer/passport)
		meetingEndedAt: t.timestamp({ mode: "date", withTimezone: true }), // When the host clicked End Session
		location: t.varchar({ length: 255 }), // Location of notarization
		ipAddress: t.varchar({ length: 255 }), // IP address from session
		workflow: t.varchar({ length: 10 }), // REN or IEN
		locationStatement: t.text(), // Statement that act was executed while all parties were in Philippines or Philippine embassy/consular office abroad

		// Document information
		documentName: t.varchar({ length: 255 }),
		documentDescription: t.text(),

		// Passport data (stored as JSON for reference)
		passportData: t.text(), // JSON string of passport data from DocoChain

		// Signers from DocoChain (stored when we have token so registry can show them without calling API)
		signersData: t.text(), // JSON array of { id, email, firstName, lastName, status, signedAt, sequence, signerRole }

		// Certificate information
		certificateNumber: t.varchar({ length: 255 }),
		certificateUrl: t.text(),

		// Sync status
		syncedToSupremeCourt: t.boolean().default(false),
		syncedAt: t.timestamp({ mode: "date", withTimezone: true }),

		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		// Indexes for proper referencing and indexing as required by Section 2, Rule VIII
		// These ensure efficient searching, chronological ordering, and proper referencing
		index("notarial_act_notarial_book_id_idx").on(t.notarialBookId),
		index("notarial_act_executed_at_idx").on(t.executedAt), // Chronological ordering index
		index("notarial_act_document_id_idx").on(t.documentId),
		index("notarial_act_doco_chain_uuid_idx").on(t.docoChainProjectUuid), // Prevent duplicates
		index("notarial_act_principal_name_idx").on(t.principalName), // For searching by principal name
		index("notarial_act_certificate_number_idx").on(t.certificateNumber), // For certificate lookup
		index("notarial_act_enp_name_idx").on(t.enpName), // For ENP search
		index("notarial_act_act_type_idx").on(t.actType), // Filter by act type
		index("notarial_act_workflow_idx").on(t.workflow), // Filter by REN/IEN
	]
).enableRLS()
