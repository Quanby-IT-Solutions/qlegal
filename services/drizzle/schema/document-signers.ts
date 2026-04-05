import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { meetingParticipantIdentityChecks } from "@/services/drizzle/schema/meeting-participant-identity-checks"
import { createTable, randomId } from "@/services/drizzle/utils"

export const documentSigners = createTable(
	"document_signer",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		documentId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		signerName: t.varchar({ length: 255 }), // Principal's name for notarial book
		signerAddress: t.text(), // Principal's address for notarial book
		signerRole: t.varchar({ length: 20 }).default("principal").notNull(), // "principal" | "witness" (assigned by ENP)
		signingOrder: t.integer(), // Order in which this signer should sign (1 = first, 2 = second, etc.)

		// Identity snapshot from meeting_participant_identity_checks
		identityCheckId: t
			.varchar({ length: 255 })
			.references(() => meetingParticipantIdentityChecks.id, { onDelete: "set null" }),
		snapshotDocumentType: t.varchar({ length: 50 }),
		snapshotDocumentNumber: t.varchar({ length: 255 }),
		snapshotFullName: t.varchar({ length: 500 }),
		snapshotFrontImageUrl: t.text(),

		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("document_signers_document_id_idx").on(t.documentId),
		index("document_signers_user_id_idx").on(t.userId),
		uniqueIndex("document_signers_document_user_unique_idx").on(t.documentId, t.userId),
		index("document_signers_identity_check_id_idx").on(t.identityCheckId),
	]
).enableRLS()
