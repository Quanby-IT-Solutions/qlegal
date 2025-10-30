"use client"

import { trpc } from "@/services/trpc/client"

export function useMessageFiles() {
	const utils = trpc.useUtils()

	return {
		// Get files for a conversation
		getFiles: (conversationId: string, uploadType?: "general" | "principal" | "enp") =>
			trpc.messageFiles.getFiles.useQuery(
				{ conversationId, uploadType },
				{
					enabled: !!conversationId,
					refetchInterval: 5000, // Poll every 5 seconds
				}
			),

		// Generate upload URL
		generateUploadUrl: trpc.messageFiles.generateUploadUrl.useMutation(),

		// Save file metadata
		saveFileMetadata: trpc.messageFiles.saveFileMetadata.useMutation({
			onSuccess: () => {
				void utils.messageFiles.getFiles.invalidate()
			},
		}),

		// Delete file
		deleteFile: trpc.messageFiles.deleteFile.useMutation({
			onSuccess: () => {
				void utils.messageFiles.getFiles.invalidate()
			},
		}),
	}
}

