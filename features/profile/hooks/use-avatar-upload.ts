"use client"

import { useMutation } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { createAvatarUploadUrl } from "@/features/profile/api/profile.actions"

export function useAvatarUpload() {
	const { data: session } = useSession()

	const mutation = useMutation({
		mutationFn: async (file: File) => {
			if (!session?.user?.id) {
				throw new Error("User not authenticated")
			}

			// Resulting pattern: [userId]/<timestamp>-<sanitized-original-filename>
			const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, "-")
			const timestamp = Date.now()
			const originalName = file.name || "avatar"
			const safeName = sanitize(originalName)
			const fileName = `${session.user.id}/${timestamp}-${safeName}`

			// 1. Ask server for signed upload URL
			const { signedUrl, path } = await createAvatarUploadUrl(fileName)

			// 2. Upload file directly
			const res = await fetch(signedUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			})

			if (!res.ok) {
				throw new Error("Upload failed")
			}

			// 3. Return path so TRPC can save it
			return path
		},
		onError: err => toast.error(err.message),
	})

	return {
		uploadAvatar: mutation.mutateAsync,
		isUploading: mutation.isPending,
	}
}
