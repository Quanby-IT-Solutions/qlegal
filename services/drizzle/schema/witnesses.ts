import { type InferSelectModel } from "drizzle-orm"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const witnesses = createTable("witness", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	// ENP who registered this witness
	enpId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	// Appointment this witness is associated with (optional - witnesses can be pre-registered)
	appointmentId: t
		.varchar({ length: 255 })
		.references(() => appointments.id, { onDelete: "set null" }),
	// Witness personal information
	name: t.varchar({ length: 255 }).notNull(),
	email: t.varchar({ length: 255 }),
	phoneNumber: t.varchar({ length: 255 }),
	address: t.text(),
	// ID verification
	idType: t.varchar({ length: 255 }), // e.g., "PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID"
	idNumber: t.varchar({ length: 255 }),
	idVerified: t.boolean().default(false).notNull(),
	idVerifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
	// Signature
	signaturePath: t.text(), // Path to signature image/document in storage
	signatureCaptured: t.boolean().default(false).notNull(),
	signatureCapturedAt: t.timestamp({ mode: "date", withTimezone: true }),
	// Status
	status: t.varchar({ length: 255 }).default("PENDING").notNull(), // PENDING, VERIFIED, REJECTED
	// Additional notes
	notes: t.text(),
	// Timestamps
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
})).enableRLS()

export type Witness = InferSelectModel<typeof witnesses>
