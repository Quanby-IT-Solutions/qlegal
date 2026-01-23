import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
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
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("document_signers_document_id_idx").on(t.documentId),
		index("document_signers_user_id_idx").on(t.userId),
		uniqueIndex("document_signers_document_user_unique_idx").on(t.documentId, t.userId),
	]
).enableRLS()
