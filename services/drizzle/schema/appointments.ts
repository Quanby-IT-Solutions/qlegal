import { type InferSelectModel } from "drizzle-orm"

import { appointmentStatus, appointmentType } from "@/services/drizzle/schema/_enums"
import { users } from "@/services/drizzle/schema/auth"
import { meetings } from "@/services/drizzle/schema/meetings"
import { createTable, randomId } from "@/services/drizzle/utils"

export const appointments = createTable("appointment", t => ({
	id: t
		.varchar({ length: 255 })
		.primaryKey()
		.$defaultFn(() => randomId()),
	// ENP who created the appointment
	userId: t
		.varchar({ length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	meetingId: t.varchar({ length: 255 }).references(() => meetings.id, { onDelete: "set null" }),
	title: t.varchar({ length: 255 }).notNull(),
	description: t.text(),
	type: appointmentType().notNull(),
	status: appointmentStatus().default("PENDING").notNull(),
	appointmentDate: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
	duration: t.integer().default(60).notNull(), // Duration in minutes
	modeOfNotarization: t.varchar({ length: 10 }), // "REN" or "IEN" - session mode (optional, null for consultations)
	location: t.text(), // For in-person appointments
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
