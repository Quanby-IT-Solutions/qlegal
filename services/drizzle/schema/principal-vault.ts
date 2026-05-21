import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { index } from "drizzle-orm/pg-core"

import { users } from "@/services/drizzle/schema/auth"
import { createTable, randomId } from "@/services/drizzle/utils"

/** Personal folders for pre–notarization file storage (not ENP-reviewed). */
export const principalVaultFolders = createTable(
	"principal_vault_folder",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		parentId: t
			.varchar({ length: 255 })
			.references((): AnyPgColumn => principalVaultFolders.id, { onDelete: "cascade" }),
		name: t.varchar({ length: 255 }).notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		index("principal_vault_folder_user_parent_idx").on(t.userId, t.parentId),
		index("principal_vault_folder_user_id_idx").on(t.userId),
	]
).enableRLS()

/** Files in the principal vault (Supabase `documents` bucket under vault/{userId}/…). */
export const principalVaultFiles = createTable(
	"principal_vault_file",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		userId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		folderId: t
			.varchar({ length: 255 })
			.references(() => principalVaultFolders.id, { onDelete: "cascade" }),
		name: t.varchar({ length: 255 }).notNull(),
		mimeType: t.varchar({ length: 255 }).notNull(),
		size: t.integer().notNull(),
		storagePath: t.text().notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
		updatedAt: t
			.timestamp({ mode: "date", withTimezone: true })
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	t => [
		index("principal_vault_file_user_folder_idx").on(t.userId, t.folderId),
		index("principal_vault_file_user_id_idx").on(t.userId),
	]
).enableRLS()

/**
 * Share link for an entire vault folder (recursive files) so an ENP can review before notarization.
 */
export const principalVaultFolderShares = createTable(
	"principal_vault_folder_share",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		token: t.varchar({ length: 128 }).notNull().unique(),
		folderId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => principalVaultFolders.id, { onDelete: "cascade" }),
		principalUserId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		recipientEmail: t.varchar({ length: 255 }).notNull(),
		recipientEnpUserId: t
			.varchar({ length: 255 })
			.references(() => users.id, { onDelete: "set null" }),
		note: t.text(),
		expiresAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("principal_vault_folder_share_token_idx").on(t.token),
		index("principal_vault_folder_share_folder_idx").on(t.folderId),
	]
).enableRLS()

/** ENP notes on a specific file within a folder share (review feedback for the principal). */
export const principalVaultShareFileComments = createTable(
	"principal_vault_share_file_comment",
	t => ({
		id: t
			.varchar({ length: 255 })
			.primaryKey()
			.$defaultFn(() => randomId()),
		shareId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => principalVaultFolderShares.id, { onDelete: "cascade" }),
		fileId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => principalVaultFiles.id, { onDelete: "cascade" }),
		authorId: t
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		body: t.text().notNull(),
		createdAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow().notNull(),
	}),
	t => [
		index("principal_vault_share_file_comment_share_file_idx").on(t.shareId, t.fileId),
		index("principal_vault_share_file_comment_file_idx").on(t.fileId),
	]
).enableRLS()
