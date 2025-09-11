"use client"

import { useCallback, useState } from "react"
import { CameraIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useDropzone, type FileWithPath } from "react-dropzone"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { getInitials } from "@/core/lib/utils"

import type { FileWithPreview } from "@/features/profile/api/profile.types"
import { ImageCropper } from "@/features/profile/components/ui/image-cropper"
import {
	useAvatarUpload,
	useAvatarUrl,
	useUpdateAvatar,
} from "@/features/profile/hooks/use-profile"

const accept = {
	"image/*": [],
}

export const AvatarUploadForm = () => {
	const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
	const [isDialogOpen, setDialogOpen] = useState(false)

	const { data: session } = useSession()
	const initials = getInitials(session?.user?.name)
	const { uploadAvatar, isUploading } = useAvatarUpload()
	const updateAvatarMutation = useUpdateAvatar()
	const { data: avatarData, refetch: refetchAvatar } = useAvatarUrl()

	const handleCrop = useCallback(
		async (croppedImageDataUrl: string) => {
			try {
				// Convert data URL to File. Preserve original filename when possible.
				const response = await fetch(croppedImageDataUrl)
				const blob = await response.blob()
				// Use the previously selected file name if available, otherwise use a timestamped fallback
				const fallbackName = `${Date.now()}-avatar.png`
				const originalName = (selectedFile as File | null)?.name ?? fallbackName
				const file = new File([blob], originalName, { type: blob.type || "image/png" })

				// Upload to Supabase and get the storage path
				const path = await uploadAvatar(file)

				// Save the storage path in DB
				await updateAvatarMutation.mutateAsync({
					imagePath: path,
				})

				// Show success message
				toast.success("Avatar updated successfully!")

				// Clean up
				setSelectedFile(null)
				setDialogOpen(false)

				// Refetch the avatar URL to show the new image
				await refetchAvatar()
			} catch {
				toast.error("Failed to update avatar. Please try again.")
			}
		},
		[uploadAvatar, updateAvatarMutation, refetchAvatar, selectedFile]
	)

	const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
		const file = acceptedFiles[0]
		if (!file) {
			alert("Selected image is too large!")
			return
		}

		const fileWithPreview = Object.assign(file, {
			preview: URL.createObjectURL(file),
		})

		setSelectedFile(fileWithPreview)
		setDialogOpen(true)
	}, [])

	const { getRootProps, getInputProps } = useDropzone({
		onDrop,
		accept,
	})

	return (
		<div className="relative">
			{selectedFile ? (
				<ImageCropper
					dialogOpen={isDialogOpen}
					setDialogOpen={setDialogOpen}
					selectedFile={selectedFile}
					setSelectedFile={setSelectedFile}
					onCrop={handleCrop}
					isLoading={isUploading || updateAvatarMutation.isPending}
				/>
			) : (
				<div className="group relative">
					<Avatar
						{...getRootProps()}
						className="ring-ring ring-offset-border size-36 cursor-pointer ring-2 ring-offset-2"
					>
						<input {...getInputProps()} />
						<AvatarImage src={avatarData?.avatarUrl ?? undefined} alt={initials} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</div>
			)}

			<Button
				{...getRootProps()}
				size="sm"
				variant="outline"
				className="bg-background/80 dark:bg-background/80 dark:hover:bg-background/90 absolute -right-1 -bottom-1 size-10 cursor-pointer rounded-full p-0 backdrop-blur-2xl"
				disabled={isUploading || updateAvatarMutation.isPending}
			>
				<input {...getInputProps()} />
				<CameraIcon className="size-5" />
			</Button>
		</div>
	)
}
