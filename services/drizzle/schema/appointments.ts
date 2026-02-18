import { type InferSelectModel } from "drizzle-orm"

import { appointmentStatus, appointmentType } from "@/services/drizzle/schema/_enums"
import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const appointments = createTable("appointment", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	// Client who booked the appointment
	clientId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	// Lawyer (ENP) with whom the appointment is booked
	lawyerId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: appointmentType().notNull(),
	status: appointmentStatus().default("PENDING").notNull(),
	appointmentDate: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
	duration: t.integer().default(60).notNull(), // Duration in minutes
	modeOfNotarization: t.varchar({ length: 10 }), // "REN" or "IEN" - session mode (optional, null for consultations)
	notes: t.text(),
	location: t.text(), // For in-person appointments
	meetingLink: t.text(), // For remote appointments
	cancelReason: t.text(),
	color: t.varchar({ length: 7 }).default("#F59E0B").notNull(),
	createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	updatedAt: t
		.timestamp({ mode: "date", withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
})).enableRLS()

export type Appointment = InferSelectModel<typeof appointments>
