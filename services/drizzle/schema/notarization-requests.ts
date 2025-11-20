import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const notarizationRequests = createTable(
	"notarization_request",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		// Principal (client) who created the request
		principalId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// ENP (lawyer) who will handle the request
		enpId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: t.varchar({ length: 255 }).notNull(),
		description: t.text(),
		workflow: t.varchar({ length: 50 }).notNull(), // "REN" or "IEN"
		priority: t.varchar({ length: 50 }).default("NORMAL").notNull(), // "NORMAL", "HIGH", "URGENT"
		status: t.varchar({ length: 50 }).default("PENDING").notNull(), // "PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"
		// Link to appointment if one is created from this request
		appointmentId: t.varchar({ length: 255 }),
		rejectReason: t.text(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		index("notarization_requests_principal_id_idx").on(t.principalId),
		index("notarization_requests_enp_id_idx").on(t.enpId),
		index("notarization_requests_status_idx").on(t.status),
		index("notarization_requests_workflow_idx").on(t.workflow),
	]
).enableRLS()

export type NotarizationRequest = InferSelectModel<typeof notarizationRequests>

