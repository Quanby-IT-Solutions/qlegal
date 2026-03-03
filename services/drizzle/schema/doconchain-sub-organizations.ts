import { type InferSelectModel } from "drizzle-orm"
import { createTable, randomId } from "@/services/drizzle/utils"

/**
 * Sub-organizations created in DocOnChain (under the parent Quanby org).
 * Admins create sub-orgs here; members can be added later via DocOnChain move API.
 */
export const doconchainSubOrganizations = createTable(
	"doconchain_sub_organization",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		/** DocOnChain sub-org UUID (for transfer credits, etc.) */
		uuid: t.varchar({ length: 255 }).notNull().unique(),
		/** DocOnChain sub-org numeric id (for move-member API) */
		numericId: t.integer().notNull(),
		name: t.varchar({ length: 255 }).notNull(),
		address: t.text().notNull(),
		subOrganizationTypeName: t.varchar({ length: 255 }).default("Department"),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => []
).enableRLS()

export type DoconchainSubOrganization = InferSelectModel<typeof doconchainSubOrganizations>
