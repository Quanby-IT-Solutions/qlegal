import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import {
	appointmentParticipantRole,
	appointmentParticipantStatus,
} from "@/services/drizzle/schema/_enums"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const appointmentParticipants = createTable(
	"appointment_participant",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		appointmentId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => appointments.id, { onDelete: "cascade" }),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: appointmentParticipantStatus("status").default("ACCEPTED").notNull(),
		invitedById: t.varchar({ length: 255 }).references(() => users.id, { onDelete: "set null" }),
		participantRole: appointmentParticipantRole("participant_role")
			.default("PARTICIPANT")
			.notNull(),
		acceptedAt: t.timestamp({ mode: "date", withTimezone: true }),
		declineReason: t.text(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("appointment_participants_appointment_id_idx").on(t.appointmentId),
		index("appointment_participants_user_id_idx").on(t.userId),
		index("appointment_participants_status_idx").on(t.status),
	]
).enableRLS()

export type AppointmentParticipant = InferSelectModel<typeof appointmentParticipants>
