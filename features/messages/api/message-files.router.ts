import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { messageAttachments } from "@/services/drizzle/schema/message-attachments"
import { conversationParticipants } from "@/services/drizzle/schema/messages"
import { getServiceRoleClient } from "@/services/supabase"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

export const messageFilesRouter = createTRPCRouter({
	// Generate file path and return bucket info for direct upload
	generateUploadUrl: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				fileName: z.string(),
				fileType: z.string(),
				uploadType: z.enum(["general", "principal", "enp"]).default("general"),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user is participant in conversation
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Generate unique file path
			const timestamp = Date.now()
			const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
			const filePath = `messages/${input.conversationId}/${input.uploadType}/${timestamp}_${sanitizedFileName}`

			// Return the path for client-side upload (since bucket is public)
			return {
				path: filePath,
				fileName: input.fileName,
				bucket: "documents",
			}
		}),

	// Save file metadata after successful upload
	saveFileMetadata: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				fileName: z.string(),
				fileSize: z.number(),
				fileType: z.string(),
				filePath: z.string(),
				uploadType: z.enum(["general", "principal", "enp"]).default("general"),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user is participant
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Generate public URL for the file
			const supabase = getServiceRoleClient()
			const { data: urlData } = supabase.storage.from("documents").getPublicUrl(input.filePath)

			// Save file metadata
			const [attachment] = await db
				.insert(messageAttachments)
				.values({
					conversationId: input.conversationId,
					uploadedBy: ctx.session.user.id,
					fileName: input.fileName,
					fileSize: input.fileSize,
					fileType: input.fileType,
					filePath: input.filePath,
					fileUrl: urlData.publicUrl,
					uploadType: input.uploadType,
				})
				.returning()

			return attachment
		}),

	// Get all files for a conversation
	getFiles: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				uploadType: z.enum(["general", "principal", "enp"]).optional(),
			})
		)
		.query(async ({ input, ctx }) => {
			// Verify user is participant
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Get files
			const files = await db.query.messageAttachments.findMany({
				where: input.uploadType
					? and(
							eq(messageAttachments.conversationId, input.conversationId),
							eq(messageAttachments.uploadType, input.uploadType)
						)
					: eq(messageAttachments.conversationId, input.conversationId),
				orderBy: [desc(messageAttachments.createdAt)],
				with: {
					uploadedBy: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
			})

			return files
		}),

	// Delete a file
	deleteFile: protectedProcedure
		.input(
			z.object({
				fileId: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Get file
			const file = await db.query.messageAttachments.findFirst({
				where: eq(messageAttachments.id, input.fileId),
			})

			if (!file) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "File not found",
				})
			}

			// Verify user is the uploader
			if (file.uploadedBy !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete files you uploaded",
				})
			}

			// Delete from storage
			const supabase = getServiceRoleClient()
			const { error: storageError } = await supabase.storage
				.from("documents")
				.remove([file.filePath])

			if (storageError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to delete file from storage: ${storageError.message}`,
				})
			}

			// Delete from database
			await db.delete(messageAttachments).where(eq(messageAttachments.id, input.fileId))

			return { success: true }
		}),
})
