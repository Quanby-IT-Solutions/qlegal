"use client"

import { useCallback, useState } from "react"
import { CameraIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useDropzone, type FileWithPath } from "react-dropzone"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Profile } from "@/core/components/user-profile"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import type { FileWithPreview } from "@/features/profile/api/profile.types"
import { ImageCropper } from "@/features/profile/components/ui/image-cropper"
import { useAvatarUpload } from "@/features/profile/hooks/use-avatar-upload"

const accept = {
	"image/*": [],
}

export const AvatarUploadForm = () => {
	const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
	const [isDialogOpen, setDialogOpen] = useState(false)

	const { data: session, update: updateSession } = useSession()
	const { uploadAvatar, isUploading } = useAvatarUpload()
	const updateAvatarMutation = trpc.profile.updateAvatar.useMutation()

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

				// Update the session to reflect the new avatar
				await updateSession()
			} catch {
				toast.error("Failed to update avatar. Please try again.")
			}
		},
		[uploadAvatar, updateAvatarMutation, updateSession, selectedFile]
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
		<div className="group relative rounded-full">
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
				<div className="relative rounded-full" {...getRootProps()}>
					<input {...getInputProps()} />
					<div className="relative rounded-full">
						<Profile
							url={session?.user?.image ?? null}
							name={session?.user?.name ?? "User"}
							size="xl"
							className="ring-ring ring-offset-border cursor-pointer ring-2 ring-offset-2 transition-all duration-200"
						/>
						{/* Hover overlay with darkening effect and camera icon */}
						<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-all duration-200 group-hover:opacity-100">
							<CameraIcon className="size-8 text-white/80" />
						</div>
					</div>
				</div>
			)}

			<Button
				{...getRootProps()}
				size="sm"
				variant="outline"
				className={cn(
					"absolute -right-1 -bottom-1 size-10 cursor-pointer rounded-full p-0 backdrop-blur-2xl transition-all duration-200",
					"bg-background/80 dark:bg-background/80",
					"hover:bg-background/90 dark:hover:bg-background/90",
					"group-hover:bg-background/90 dark:group-hover:bg-background/90"
				)}
				disabled={isUploading || updateAvatarMutation.isPending}
			>
				<input {...getInputProps()} />
				<CameraIcon className="size-5" />
			</Button>
		</div>
	)
}
