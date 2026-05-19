import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

export const contractAgentSessions = createTable(
	"contract_agent_session",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		accessToken: t.varchar({ length: 255 }).notNull(),
		userId: t.varchar({ length: 255 }).references(() => users.id, { onDelete: "set null" }),
		sourceFileName: t.varchar({ length: 255 }),
		sourceMimeType: t.varchar({ length: 255 }),
		contractTitle: t.varchar({ length: 255 }),
		analysis: t.jsonb(),
		generatedContract: t.text(),
		generatedContractType: t.varchar({ length: 100 }),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		lastInteractionAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("contract_agent_session_user_id_idx").on(t.userId),
		index("contract_agent_session_updated_at_idx").on(t.updatedAt),
		index("contract_agent_session_last_interaction_at_idx").on(t.lastInteractionAt),
	]
).enableRLS()

export const contractAgentMessages = createTable(
	"contract_agent_message",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		sessionId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => contractAgentSessions.id, { onDelete: "cascade" }),
		role: t.varchar({ length: 50 }).notNull(),
		content: t.text().notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("contract_agent_message_session_id_idx").on(t.sessionId),
		index("contract_agent_message_created_at_idx").on(t.createdAt),
	]
).enableRLS()
