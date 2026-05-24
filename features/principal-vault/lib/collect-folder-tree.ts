import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import {
	principalVaultFiles,
	principalVaultFolders,
} from "@/services/drizzle/schema/principal-vault"

type DbClient = typeof db

export async function collectDescendantFolderIds(
	dbClient: DbClient,
	rootFolderId: string,
	ownerUserId: string
): Promise<string[]> {
	const ids = new Set<string>([rootFolderId])
	let frontier: string[] = [rootFolderId]
	while (frontier.length > 0) {
		const children = await dbClient.query.principalVaultFolders.findMany({
			where: and(
				eq(principalVaultFolders.userId, ownerUserId),
				inArray(principalVaultFolders.parentId, frontier)
			),
			columns: { id: true },
		})
		frontier = children.map(c => c.id)
		for (const id of frontier) ids.add(id)
	}
	return [...ids]
}

export async function listAllFilesInFolderTree(
	dbClient: DbClient,
	rootFolderId: string,
	ownerUserId: string
) {
	const folderIds = await collectDescendantFolderIds(dbClient, rootFolderId, ownerUserId)
	return dbClient.query.principalVaultFiles.findMany({
		where: and(
			eq(principalVaultFiles.userId, ownerUserId),
			inArray(principalVaultFiles.folderId, folderIds)
		),
		orderBy: [asc(principalVaultFiles.name)],
		columns: {
			id: true,
			name: true,
			mimeType: true,
			size: true,
			storagePath: true,
			folderId: true,
		},
	})
}

export async function relativeFolderPathFromShareRoot(
	dbClient: DbClient,
	fileFolderId: string,
	shareRootFolderId: string,
	ownerUserId: string
): Promise<string> {
	const segments: string[] = []
	let current: string | null = fileFolderId
	while (current && current !== shareRootFolderId) {
		const row = await dbClient.query.principalVaultFolders.findFirst({
			where: and(
				eq(principalVaultFolders.id, current),
				eq(principalVaultFolders.userId, ownerUserId)
			),
			columns: { name: true, parentId: true },
		})
		if (!row) break
		segments.unshift(row.name)
		current = row.parentId ?? null
	}
	return segments.join(" / ")
}

/** Whether the vault file lives inside the given folder or one of its descendants (same owner). */
export async function isVaultFileInSharedFolderTree(
	dbClient: DbClient,
	fileId: string,
	shareRootFolderId: string,
	ownerUserId: string
): Promise<boolean> {
	const file = await dbClient.query.principalVaultFiles.findFirst({
		where: and(eq(principalVaultFiles.id, fileId), eq(principalVaultFiles.userId, ownerUserId)),
		columns: { folderId: true },
	})
	if (!file?.folderId) return false
	const folderIds = await collectDescendantFolderIds(dbClient, shareRootFolderId, ownerUserId)
	return folderIds.includes(file.folderId)
}
