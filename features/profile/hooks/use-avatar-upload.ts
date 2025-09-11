import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { usePresignedUrl } from "@/services/supabase/presigned-url"
import { getPublicUrl } from "@/services/supabase/signed-url"
import { useUploadFile } from "@/services/supabase/upload"
import { trpc } from "@/services/trpc/client"

// Helper function to convert canvas data URL to File
function dataURLtoFile(dataURL: string, filename: string): File {
	const arr = dataURL.split(",")
	const mimeMatch = arr[0]?.match(/:(.*?);/)
	const mime = mimeMatch ? mimeMatch[1] : "image/png"
	const bstr = atob(arr[1] ?? "")
	let n = bstr.length
	const u8arr = new Uint8Array(n)
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n)
	}
	return new File([u8arr], filename, { type: mime })
}

export function useAvatarUpload() {
	const [isUploading, setIsUploading] = useState(false)
	const { data: session, update } = useSession()

	const presignedUrl = usePresignedUrl()
	const uploadFile = useUploadFile()
	const updateAvatar = trpc.profile.updateAvatar.useMutation({
		onSuccess: async data => {
			// Update the session with the new image
			await update({
				...session,
				user: {
					...session?.user,
					image: data.user.image,
				},
			})
			toast.success("Avatar updated successfully!")
		},
		onError: error => {
			toast.error(`Failed to update avatar: ${error.message}`)
		},
	})

	const uploadAvatar = async (croppedImageDataUrl: string) => {
		try {
			setIsUploading(true)

			// Convert the cropped image to a file
			const fileName = `avatar-${session?.user?.id}-${Date.now()}.png`
			const croppedFile = dataURLtoFile(croppedImageDataUrl, fileName)

			// Generate presigned URL for avatar bucket
			const presignedResult = await presignedUrl.mutateAsync({
				file: croppedFile,
				bucket: "avatars",
				folderPath: session?.user?.id ?? "unknown",
				upsert: true,
			})

			// Upload the file to Supabase
			await uploadFile.mutateAsync({
				signedUrl: presignedResult.signedUrl,
				file: croppedFile,
				contentType: "image/png",
			})

			// Get the public URL for the uploaded avatar
			const avatarUrl = await getPublicUrl("avatars", presignedResult.path)

			// Update the user's avatar in the database
			await updateAvatar.mutateAsync({
				imageUrl: avatarUrl,
			})

			return avatarUrl
		} catch {
			toast.error("Failed to upload avatar. Please try again.")
			throw new Error("Avatar upload failed")
		} finally {
			setIsUploading(false)
		}
	}

	return {
		uploadAvatar,
		isUploading,
	}
}
