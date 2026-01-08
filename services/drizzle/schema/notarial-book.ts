import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { createTable, randomId } from "@/services/drizzle/utils"

// Notarial act types per Supreme Court requirements
export const notarialActTypeEnum = (name: string) => ({
	[name]: ["ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"] as const,
})

// Notarial Book - One per ENP per ENF
export const notarialBooks = createTable("notarial_book", t => ({
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
})).enableRLS()

// Notarial Act - Individual entries in the notarial book
export const notarialActs = createTable("notarial_act", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	notarialBookId: t
		.varchar({ length: 255 })
		.references(() => notarialBooks.id)
		.notNull(),
	actType: t.varchar({ length: 50 }).notNull(), // ACKNOWLEDGMENT, AFFIRMATION, JURAT, SIGNATURE_WITNESSING
	documentId: t
		.varchar({ length: 255 })
		.references(() => documents.id),
	docoChainProjectUuid: t.varchar({ length: 255 }), // DocoChain project UUID for passport data
	
	// Principal information
	principalName: t.varchar({ length: 255 }).notNull(),
	principalIdNumber: t.varchar({ length: 255 }),
	principalAddress: t.text(),
	
	// Witness information (if applicable)
	witnessName: t.varchar({ length: 255 }),
	witnessIdNumber: t.varchar({ length: 255 }),
	
	// ENP information
	enpName: t.varchar({ length: 255 }).notNull(),
	enpRollNumber: t.varchar({ length: 255 }),
	
	// Execution details
	executedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	location: t.varchar({ length: 255 }), // Location of notarization
	ipAddress: t.varchar({ length: 255 }), // IP address from session
	workflow: t.varchar({ length: 10 }), // REN or IEN
	
	// Document information
	documentName: t.varchar({ length: 255 }),
	documentDescription: t.text(),
	
	// Passport data (stored as JSON for reference)
	passportData: t.text(), // JSON string of passport data from DocoChain
	
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
})).enableRLS()







