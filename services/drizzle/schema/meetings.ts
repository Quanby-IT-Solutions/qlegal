import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const meetings = createTable(
	"meeting",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		roomId: t.varchar({ length: 255 }).notNull(), // VideoSDK room ID
		// Full-freeze lock for document setup actions (upload/reorder/signer edits/project creation).
		isDocumentOrderLocked: t.boolean().default(false).notNull(),
		createdById: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("meetings_room_id_idx").on(t.roomId),
		index("meetings_created_by_idx").on(t.createdById),
	]
).enableRLS()

export type Meeting = InferSelectModel<typeof meetings>
