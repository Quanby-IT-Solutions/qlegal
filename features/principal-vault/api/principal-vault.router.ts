import { randomBytes } from "node:crypto"
import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { getUrl } from "@/core/lib/get-url"
import { getFullName } from "@/core/lib/utils"

import { type db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import {
	principalVaultFiles,
	principalVaultFolders,
	principalVaultFolderShares,
	principalVaultShareFileComments,
} from "@/services/drizzle/schema/principal-vault"
import { randomId } from "@/services/drizzle/utils"
import { sendVaultFolderShareEmail } from "@/services/react-email/lib/send.vault-folder-share"
import { getServiceRoleClient } from "@/services/supabase"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	isVaultFileInSharedFolderTree,
	listAllFilesInFolderTree,
	relativeFolderPathFromShareRoot,
} from "@/features/principal-vault/lib/collect-folder-tree"

const MAX_FILE_BYTES = 52_428_800 // 50 MB
/** Short-lived signed URLs for opening vault files in the browser (PDF viewer / download). */
const VAULT_READ_URL_EXPIRY_SEC = 3600

type DbClient = typeof db

function createVaultDocumentsReadSignedUrl(storagePath: string) {
	const supabase = getServiceRoleClient()
	return supabase.storage.from("documents").createSignedUrl(storagePath, VAULT_READ_URL_EXPIRY_SEC)
}

function sanitizeStorageFileName(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file"
}

async function assertFolderOwned(dbClient: DbClient, userId: string, folderId: string | null) {
	if (folderId === null) return
	const folder = await dbClient.query.principalVaultFolders.findFirst({
		where: and(eq(principalVaultFolders.id, folderId), eq(principalVaultFolders.userId, userId)),
		columns: { id: true },
	})
	if (!folder) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
	}
}

async function buildAncestors(
	dbClient: DbClient,
	userId: string,
	folderId: string | null
): Promise<Array<{ id: string; name: string }>> {
	const chain: Array<{ id: string; name: string }> = []
	let currentId: string | null = folderId
	while (currentId) {
		const row = await dbClient.query.principalVaultFolders.findFirst({
			where: and(eq(principalVaultFolders.id, currentId), eq(principalVaultFolders.userId, userId)),
			columns: { id: true, name: true, parentId: true },
		})
		if (!row) break
		chain.unshift({ id: row.id, name: row.name })
		currentId = row.parentId ?? null
	}
	return chain
}

function vaultPathPrefix(userId: string): string {
	return `vault/${userId}/`
}

async function resolveEnpVaultShareContext(
	ctx: {
		db: DbClient
		session: { user: { id: string; email?: string | null; role?: string | null } }
	},
	token: string
) {
	if (ctx.session.user.role !== "ENP") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only an Electronic Notary Public can open this review link",
		})
	}

	const share = await ctx.db.query.principalVaultFolderShares.findFirst({
		where: eq(principalVaultFolderShares.token, token),
	})
	if (!share) {
		throw new TRPCError({ code: "NOT_FOUND", message: "This link is invalid or has been removed" })
	}
	if (share.expiresAt.getTime() < Date.now()) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "This link has expired" })
	}

	const sessionEmail = ctx.session.user.email?.trim().toLowerCase() ?? ""
	const recipient = share.recipientEmail.trim().toLowerCase()
	const idOk = share.recipientEnpUserId && share.recipientEnpUserId === ctx.session.user.id
	const emailOk = sessionEmail.length > 0 && sessionEmail === recipient
	if (!idOk && !emailOk) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "This link was issued to a different notary. Sign in with the invited account.",
		})
	}

	const folder = await ctx.db.query.principalVaultFolders.findFirst({
		where: and(
			eq(principalVaultFolders.id, share.folderId),
			eq(principalVaultFolders.userId, share.principalUserId)
		),
		columns: { id: true, name: true },
	})
	if (!folder) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "The shared folder no longer exists",
		})
	}

	return { share, folder }
}

export const principalVaultRouter = createTRPCRouter({
	list: protectedProcedure
		.input(z.object({ parentId: z.string().nullable() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			if (input.parentId !== null) {
				const parent = await ctx.db.query.principalVaultFolders.findFirst({
					where: and(
						eq(principalVaultFolders.id, input.parentId),
						eq(principalVaultFolders.userId, userId)
					),
					columns: { id: true },
				})
				if (!parent) {
					throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
				}
			}

			const parentCondition =
				input.parentId === null
					? isNull(principalVaultFolders.parentId)
					: eq(principalVaultFolders.parentId, input.parentId)

			const folders = await ctx.db.query.principalVaultFolders.findMany({
				where: and(eq(principalVaultFolders.userId, userId), parentCondition),
				orderBy: [asc(principalVaultFolders.name)],
				columns: { id: true, name: true, createdAt: true, updatedAt: true },
			})

			const fileWhere =
				input.parentId === null
					? and(eq(principalVaultFiles.userId, userId), isNull(principalVaultFiles.folderId))
					: and(
							eq(principalVaultFiles.userId, userId),
							eq(principalVaultFiles.folderId, input.parentId)
						)

			const files = await ctx.db.query.principalVaultFiles.findMany({
				where: fileWhere,
				orderBy: [asc(principalVaultFiles.name)],
				columns: {
					id: true,
					name: true,
					mimeType: true,
					size: true,
					storagePath: true,
					createdAt: true,
				},
			})

			const ancestors = await buildAncestors(ctx.db, userId, input.parentId)

			return { folders, files, ancestors }
		}),

	/** All files in a folder and its subfolders (for meeting import). Owner only. */
	listFolderTreeFiles: protectedProcedure
		.input(z.object({ folderId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const folder = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.id, input.folderId),
					eq(principalVaultFolders.userId, userId)
				),
				columns: { id: true, name: true },
			})
			if (!folder) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
			}
			const files = await listAllFilesInFolderTree(ctx.db, input.folderId, userId)
			return {
				folderId: folder.id,
				folderName: folder.name,
				files: files.map(f => ({
					id: f.id,
					name: f.name,
					mimeType: f.mimeType,
					size: f.size,
				})),
			}
		}),

	createFolder: protectedProcedure
		.input(
			z.object({
				parentId: z.string().nullable(),
				name: z.string().trim().min(1, "Name is required").max(255),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			await assertFolderOwned(ctx.db, userId, input.parentId)

			const dup = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.userId, userId),
					input.parentId === null
						? isNull(principalVaultFolders.parentId)
						: eq(principalVaultFolders.parentId, input.parentId),
					eq(principalVaultFolders.name, input.name)
				),
				columns: { id: true },
			})
			if (dup) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A folder with this name already exists here",
				})
			}

			const [created] = await ctx.db
				.insert(principalVaultFolders)
				.values({
					userId,
					parentId: input.parentId,
					name: input.name,
				})
				.returning({
					id: principalVaultFolders.id,
					name: principalVaultFolders.name,
					createdAt: principalVaultFolders.createdAt,
				})

			return created
		}),

	renameFolder: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
				name: z.string().trim().min(1, "Name is required").max(255),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const folder = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.id, input.id),
					eq(principalVaultFolders.userId, userId)
				),
				columns: { id: true, parentId: true },
			})
			if (!folder) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
			}

			const dup = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.userId, userId),
					folder.parentId === null
						? isNull(principalVaultFolders.parentId)
						: eq(principalVaultFolders.parentId, folder.parentId),
					eq(principalVaultFolders.name, input.name)
				),
				columns: { id: true },
			})
			if (dup && dup.id !== input.id) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A folder with this name already exists here",
				})
			}

			await ctx.db
				.update(principalVaultFolders)
				.set({ name: input.name })
				.where(
					and(eq(principalVaultFolders.id, input.id), eq(principalVaultFolders.userId, userId))
				)

			return { ok: true as const }
		}),

	deleteFolder: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const folder = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.id, input.id),
					eq(principalVaultFolders.userId, userId)
				),
				columns: { id: true },
			})
			if (!folder) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
			}

			const childFolder = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.userId, userId),
					eq(principalVaultFolders.parentId, input.id)
				),
				columns: { id: true },
			})
			if (childFolder) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Remove files and subfolders before deleting this folder",
				})
			}

			const childFile = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(
					eq(principalVaultFiles.userId, userId),
					eq(principalVaultFiles.folderId, input.id)
				),
				columns: { id: true },
			})
			if (childFile) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Remove files from this folder before deleting it",
				})
			}

			await ctx.db
				.delete(principalVaultFolders)
				.where(
					and(eq(principalVaultFolders.id, input.id), eq(principalVaultFolders.userId, userId))
				)

			return { ok: true as const }
		}),

	prepareUpload: protectedProcedure
		.input(
			z.object({
				folderId: z.string().nullable(),
				fileName: z.string().min(1).max(255),
				fileType: z.string().min(1).max(255),
				fileSize: z.number().int().positive(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			if (input.fileSize > MAX_FILE_BYTES) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB)`,
				})
			}
			await assertFolderOwned(ctx.db, userId, input.folderId)

			const supabase = getServiceRoleClient()
			const key = `${vaultPathPrefix(userId)}${randomId()}_${sanitizeStorageFileName(input.fileName)}`
			const { data, error } = await supabase.storage.from("documents").createSignedUploadUrl(key, {
				upsert: false,
			})
			if (error || !data) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error?.message ?? "Could not create upload URL",
				})
			}

			return {
				signedUrl: data.signedUrl,
				path: data.path,
				maxBytes: MAX_FILE_BYTES,
			}
		}),

	completeUpload: protectedProcedure
		.input(
			z.object({
				folderId: z.string().nullable(),
				storagePath: z.string().min(1),
				fileName: z.string().min(1).max(255),
				fileType: z.string().min(1).max(255),
				fileSize: z.number().int().positive(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			if (input.fileSize > MAX_FILE_BYTES) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "File too large" })
			}
			const prefix = vaultPathPrefix(userId)
			if (!input.storagePath.startsWith(prefix)) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Invalid storage path" })
			}
			await assertFolderOwned(ctx.db, userId, input.folderId)

			const [row] = await ctx.db
				.insert(principalVaultFiles)
				.values({
					userId,
					folderId: input.folderId,
					name: input.fileName,
					mimeType: input.fileType,
					size: input.fileSize,
					storagePath: input.storagePath,
				})
				.returning({
					id: principalVaultFiles.id,
					name: principalVaultFiles.name,
					mimeType: principalVaultFiles.mimeType,
					size: principalVaultFiles.size,
					storagePath: principalVaultFiles.storagePath,
					createdAt: principalVaultFiles.createdAt,
				})

			return row
		}),

	renameFile: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
				name: z.string().trim().min(1, "Name is required").max(255),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const file = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(eq(principalVaultFiles.id, input.id), eq(principalVaultFiles.userId, userId)),
				columns: { id: true, folderId: true },
			})
			if (!file) {
				throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
			}

			const dupWhere =
				file.folderId === null
					? and(
							eq(principalVaultFiles.userId, userId),
							isNull(principalVaultFiles.folderId),
							eq(principalVaultFiles.name, input.name)
						)
					: and(
							eq(principalVaultFiles.userId, userId),
							eq(principalVaultFiles.folderId, file.folderId),
							eq(principalVaultFiles.name, input.name)
						)

			const dup = await ctx.db.query.principalVaultFiles.findFirst({
				where: dupWhere,
				columns: { id: true },
			})
			if (dup && dup.id !== input.id) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A file with this name already exists in this folder",
				})
			}

			await ctx.db
				.update(principalVaultFiles)
				.set({ name: input.name })
				.where(and(eq(principalVaultFiles.id, input.id), eq(principalVaultFiles.userId, userId)))

			return { ok: true as const }
		}),

	deleteFile: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const file = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(eq(principalVaultFiles.id, input.id), eq(principalVaultFiles.userId, userId)),
				columns: { id: true, storagePath: true },
			})
			if (!file) {
				throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
			}

			const supabase = getServiceRoleClient()
			const { error: storageError } = await supabase.storage
				.from("documents")
				.remove([file.storagePath])
			if (storageError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: storageError.message,
				})
			}

			await ctx.db
				.delete(principalVaultFiles)
				.where(and(eq(principalVaultFiles.id, input.id), eq(principalVaultFiles.userId, userId)))

			return { ok: true as const }
		}),

	/** Owner: open or download a vault file via a time-limited URL (works even if the bucket is private). */
	getMyVaultFileReadUrl: protectedProcedure
		.input(z.object({ fileId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const file = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(
					eq(principalVaultFiles.id, input.fileId),
					eq(principalVaultFiles.userId, ctx.session.user.id)
				),
				columns: { storagePath: true },
			})
			if (!file) {
				throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
			}
			const prefix = vaultPathPrefix(ctx.session.user.id)
			if (!file.storagePath.startsWith(prefix)) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Invalid file location" })
			}

			const { data, error } = await createVaultDocumentsReadSignedUrl(file.storagePath)
			if (error || !data?.signedUrl) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error?.message ?? "Could not create file link",
				})
			}

			return {
				url: data.signedUrl,
				expiresInSeconds: VAULT_READ_URL_EXPIRY_SEC,
			}
		}),

	/** Invited ENP: read-only signed URL for a file inside an active share. */
	getSharedVaultFileReadUrl: protectedProcedure
		.input(
			z.object({
				token: z.string().min(1),
				fileId: z.string().min(1),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { share, folder } = await resolveEnpVaultShareContext(ctx, input.token)
			const inTree = await isVaultFileInSharedFolderTree(
				ctx.db,
				input.fileId,
				folder.id,
				share.principalUserId
			)
			if (!inTree) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File is not part of this shared folder",
				})
			}

			const file = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(
					eq(principalVaultFiles.id, input.fileId),
					eq(principalVaultFiles.userId, share.principalUserId)
				),
				columns: { storagePath: true },
			})
			if (!file) {
				throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
			}

			const prefix = vaultPathPrefix(share.principalUserId)
			if (!file.storagePath.startsWith(prefix)) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Invalid file location" })
			}

			const { data, error } = await createVaultDocumentsReadSignedUrl(file.storagePath)
			if (error || !data?.signedUrl) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error?.message ?? "Could not create file link",
				})
			}

			return {
				url: data.signedUrl,
				expiresInSeconds: VAULT_READ_URL_EXPIRY_SEC,
			}
		}),

	createFolderShare: protectedProcedure
		.input(
			z.object({
				folderId: z.string().min(1),
				recipientEmail: z.string().trim().email("Enter a valid email"),
				note: z.string().trim().max(2000).optional(),
				sendEmail: z.boolean().default(false),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const role = ctx.session.user.role
			if (role !== "PRINCIPAL" && role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only principals and notaries can share My files folders for review",
				})
			}

			const principalUserId = ctx.session.user.id
			const folder = await ctx.db.query.principalVaultFolders.findFirst({
				where: and(
					eq(principalVaultFolders.id, input.folderId),
					eq(principalVaultFolders.userId, principalUserId)
				),
				columns: { id: true, name: true },
			})
			if (!folder) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" })
			}

			const recipientEmail = input.recipientEmail.trim().toLowerCase()
			const enpUser = await ctx.db.query.users.findFirst({
				where: and(eq(users.role, "ENP"), sql`lower(${users.email}) = ${recipientEmail}`),
				columns: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
				},
			})
			if (!enpUser?.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No Electronic Notary Public (ENP) account exists for that email address",
				})
			}

			const filesInTree = await listAllFilesInFolderTree(ctx.db, folder.id, principalUserId)
			const token = randomBytes(32).toString("hex")
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 30)

			await ctx.db.insert(principalVaultFolderShares).values({
				token,
				folderId: folder.id,
				principalUserId,
				recipientEmail,
				recipientEnpUserId: enpUser.id,
				note: input.note?.length ? input.note : null,
				expiresAt,
			})

			const principalUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, principalUserId),
				columns: { firstName: true, lastName: true, email: true },
			})
			const principalName =
				getFullName({
					firstName: principalUser?.firstName,
					lastName: principalUser?.lastName,
				}) ||
				ctx.session.user.name?.trim() ||
				(principalUser?.email ?? "A client")

			let emailSent = false
			if (input.sendEmail) {
				try {
					await sendVaultFolderShareEmail({
						enpEmail: recipientEmail,
						enpFirstName: enpUser.firstName ?? null,
						enpLastName: enpUser.lastName ?? null,
						principalName,
						principalEmail: principalUser?.email ?? ctx.session.user.email,
						folderName: folder.name,
						fileCount: filesInTree.length,
						token,
						note: input.note?.length ? input.note : null,
					})
					emailSent = true
				} catch (e) {
					console.error("sendVaultFolderShareEmail failed:", e)
					await ctx.db
						.delete(principalVaultFolderShares)
						.where(eq(principalVaultFolderShares.token, token))
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Could not send email. Check your mail configuration or try again.",
					})
				}
			}

			return {
				token,
				expiresAt,
				fileCount: filesInTree.length,
				folderName: folder.name,
				shareUrl: `${getUrl()}/vault-share/${token}`,
				emailSent,
			}
		}),

	getFolderShareForEnp: protectedProcedure
		.input(z.object({ token: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const { share, folder } = await resolveEnpVaultShareContext(ctx, input.token)

			const principalUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, share.principalUserId),
				columns: { firstName: true, lastName: true, email: true },
			})
			const principalName =
				getFullName({
					firstName: principalUser?.firstName,
					lastName: principalUser?.lastName,
				}) ||
				(principalUser?.email ?? "Client")

			const rawFiles = await listAllFilesInFolderTree(ctx.db, folder.id, share.principalUserId)

			const commentRows = await ctx.db.query.principalVaultShareFileComments.findMany({
				where: eq(principalVaultShareFileComments.shareId, share.id),
				columns: { fileId: true },
			})
			const commentCountByFileId = new Map<string, number>()
			for (const row of commentRows) {
				commentCountByFileId.set(row.fileId, (commentCountByFileId.get(row.fileId) ?? 0) + 1)
			}

			const files = await Promise.all(
				rawFiles.map(async f => {
					if (!f.folderId) {
						return {
							id: f.id,
							name: f.name,
							displayPath: f.name,
							mimeType: f.mimeType,
							size: f.size,
							storagePath: f.storagePath,
							commentCount: commentCountByFileId.get(f.id) ?? 0,
						}
					}
					const rel = await relativeFolderPathFromShareRoot(
						ctx.db,
						f.folderId,
						folder.id,
						share.principalUserId
					)
					const displayPath = rel ? `${rel} / ${f.name}` : f.name
					return {
						id: f.id,
						name: f.name,
						displayPath,
						mimeType: f.mimeType,
						size: f.size,
						storagePath: f.storagePath,
						commentCount: commentCountByFileId.get(f.id) ?? 0,
					}
				})
			)

			return {
				folderName: folder.name,
				principalName,
				principalEmail: principalUser?.email ?? null,
				note: share.note,
				expiresAt: share.expiresAt,
				files,
			}
		}),

	listVaultShareFileComments: protectedProcedure
		.input(
			z.object({
				token: z.string().min(1),
				fileId: z.string().min(1),
			})
		)
		.query(async ({ ctx, input }) => {
			const { share, folder } = await resolveEnpVaultShareContext(ctx, input.token)
			const inTree = await isVaultFileInSharedFolderTree(
				ctx.db,
				input.fileId,
				folder.id,
				share.principalUserId
			)
			if (!inTree) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File is not part of this shared folder",
				})
			}

			const rows = await ctx.db.query.principalVaultShareFileComments.findMany({
				where: and(
					eq(principalVaultShareFileComments.shareId, share.id),
					eq(principalVaultShareFileComments.fileId, input.fileId)
				),
				orderBy: [asc(principalVaultShareFileComments.createdAt)],
				with: {
					author: { columns: { firstName: true, lastName: true, email: true } },
				},
			})

			return rows.map(r => ({
				id: r.id,
				body: r.body,
				createdAt: r.createdAt,
				authorName: getFullName(r.author) || (r.author?.email ?? "Notary"),
			}))
		}),

	addVaultShareFileComment: protectedProcedure
		.input(
			z.object({
				token: z.string().min(1),
				fileId: z.string().min(1),
				body: z.string().trim().min(1, "Write a note").max(8000),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { share, folder } = await resolveEnpVaultShareContext(ctx, input.token)
			const inTree = await isVaultFileInSharedFolderTree(
				ctx.db,
				input.fileId,
				folder.id,
				share.principalUserId
			)
			if (!inTree) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File is not part of this shared folder",
				})
			}

			const [created] = await ctx.db
				.insert(principalVaultShareFileComments)
				.values({
					shareId: share.id,
					fileId: input.fileId,
					authorId: ctx.session.user.id,
					body: input.body,
				})
				.returning({
					id: principalVaultShareFileComments.id,
					body: principalVaultShareFileComments.body,
					createdAt: principalVaultShareFileComments.createdAt,
				})

			const author = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
				columns: { firstName: true, lastName: true, email: true },
			})

			return {
				...created,
				authorName: getFullName(author) || (author?.email ?? "Notary"),
			}
		}),

	listVaultFileCommentsForPrincipal: protectedProcedure
		.input(z.object({ fileId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const principalUserId = ctx.session.user.id
			const file = await ctx.db.query.principalVaultFiles.findFirst({
				where: and(
					eq(principalVaultFiles.id, input.fileId),
					eq(principalVaultFiles.userId, principalUserId)
				),
				columns: { id: true },
			})
			if (!file) {
				throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
			}

			const rows = await ctx.db.query.principalVaultShareFileComments.findMany({
				where: eq(principalVaultShareFileComments.fileId, input.fileId),
				orderBy: [desc(principalVaultShareFileComments.createdAt)],
				with: {
					author: { columns: { firstName: true, lastName: true, email: true } },
					share: {
						columns: { principalUserId: true },
						with: { folder: { columns: { name: true } } },
					},
				},
			})

			const mine = rows.filter(r => r.share.principalUserId === principalUserId)

			return mine.map(r => ({
				id: r.id,
				body: r.body,
				createdAt: r.createdAt,
				authorName: getFullName(r.author) || (r.author?.email ?? "Notary"),
				sharedFolderName: r.share.folder?.name ?? "Shared folder",
			}))
		}),
})
