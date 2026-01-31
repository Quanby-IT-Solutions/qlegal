import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { kycStatus } from "@/services/drizzle/schema/_enums"
import { createTable, randomId } from "@/services/drizzle/utils"

import { users } from "./auth"

/**
 * KYC Sessions Table
 * Tracks KYC verification workflow sessions and their lifecycle
 * Separates workflow management from structured ID card data (id_card_details)
 */
export const kycSessions = createTable(
	"kyc_session",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),

		// User reference
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// HyperVerge transaction ID
		transactionId: t.varchar({ length: 255 }).notNull().unique(),

		// Session type: "hosted" (mobile link) or "direct" (desktop camera API)
		sessionType: t.varchar({ length: 50 }).notNull(), // "hosted" | "direct"

		// Hosted workflow link (for mobile KYC)
		hostedLink: t.text(),
		hostedLinkCreatedAt: t.timestamp({ mode: "date", withTimezone: true }),
		hostedLinkExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),

		// Status tracking
		status: kycStatus().default("NOT_STARTED").notNull(),

		// Reference to the final verified ID card details (when status = VERIFIED)
		idCardDetailId: t.varchar({ length: 255 }),

		// Workflow metadata (store HyperVerge-specific workflow details as JSON)
		workflowMetadata: t.jsonb(),

		// Timestamps
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		verifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
	}),
	table => [
		index("kyc_session_user_id_idx").on(table.userId),
		index("kyc_session_transaction_id_idx").on(table.transactionId),
		index("kyc_session_status_idx").on(table.status),
		index("kyc_session_created_at_idx").on(table.createdAt),
	]
).enableRLS()

export type KycSession = InferSelectModel<typeof kycSessions>
