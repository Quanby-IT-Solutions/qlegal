import { type InferSelectModel } from "drizzle-orm"
import { index } from "drizzle-orm/pg-core"

import { createTable, randomId } from "@/services/drizzle/utils"

import { users } from "./auth"
import { meetings } from "./meetings"

/**
 * Liveness validation attempts table
 * Tracks essential validation info - detailed results available in HyperVerge dashboard
 */
export const livenessValidations = createTable(
	"liveness_validation",
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

		// Meeting reference (optional - for meeting-specific validations)
		meetingId: t.varchar({ length: 255 }).references(() => meetings.id, { onDelete: "cascade" }),

		// HyperVerge transaction ID (use this to lookup details in HyperVerge dashboard)
		transactionId: t.varchar({ length: 255 }).notNull().unique(),

		// Attempt tracking for retry logic
		attemptNumber: t.integer().notNull().default(1),

		// Validation result
		status: t.varchar({ length: 50 }).notNull(), // "pending" | "pass" | "fail"

		// Quick error reference (detailed info in HyperVerge)
		errorMessage: t.text(),

		// Stored decision payload (so UI can read DB without re-calling HyperVerge)
		decisionJson: t.text(),

		// Stored raw workflow output / webhook payload for debugging (optional)
		rawResultJson: t.text(),

		// Timestamp
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: t.timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
	}),
	table => [
		index("liveness_validation_user_id_idx").on(table.userId),
		index("liveness_validation_meeting_id_idx").on(table.meetingId),
		index("liveness_validation_transaction_id_idx").on(table.transactionId),
		index("liveness_validation_status_idx").on(table.status),
		index("liveness_validation_created_at_idx").on(table.createdAt),
		index("liveness_validation_updated_at_idx").on(table.updatedAt),
		// Composite index for checking if user verified for specific meeting
		index("liveness_validation_user_meeting_idx").on(table.userId, table.meetingId),
	]
).enableRLS()

export type LivenessValidation = InferSelectModel<typeof livenessValidations>
