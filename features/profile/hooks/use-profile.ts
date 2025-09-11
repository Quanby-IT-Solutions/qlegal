"use client"

import { useMutation } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import { createAvatarUploadUrl } from "@/features/profile/api/profile.actions"

export function useAvatarUpload() {
	const { data: session } = useSession()

	const mutation = useMutation({
		mutationFn: async (file: File) => {
			if (!session?.user?.id) {
				throw new Error("User not authenticated")
			}

			// Create filename with userId pattern: [userId]/avatar.png
			const fileName = `${session.user.id}/avatar.png`

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

export const useUpdateAvatar = () => {
	return trpc.profile.updateAvatar.useMutation()
}

export const useAvatarUrl = () => {
	return trpc.profile.getAvatarUrl.useQuery()
}
