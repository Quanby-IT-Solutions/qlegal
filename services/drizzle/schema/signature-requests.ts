import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { meetings } from "@/services/drizzle/schema/meetings"
import { createTable, randomId } from "@/services/drizzle/utils"

export const signatureRequests = createTable(
	"signature_request",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		meetingId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => meetings.id, { onDelete: "cascade" }),
		documentId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		requesterId: t // Principal user
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		signerId: t // ENP user who needs to sign
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: t.varchar({ length: 50 }).default("PENDING").notNull(), // PENDING, SIGNED, DECLINED
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
		signedAt: t.timestamp({ mode: "date", withTimezone: true }),
	}),
	t => [
		index("signature_requests_meeting_id_idx").on(t.meetingId),
		index("signature_requests_signer_id_idx").on(t.signerId),
		index("signature_requests_status_idx").on(t.status),
	]
).enableRLS()

export type SignatureRequest = InferSelectModel<typeof signatureRequests>

