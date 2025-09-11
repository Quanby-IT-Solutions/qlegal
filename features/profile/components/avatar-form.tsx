"use client"

import { useState } from "react"
import { CameraIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Profile } from "@/core/components/user-profile"

import { trpc } from "@/services/trpc/client"

// import {
// 	useProfileImageSelection,
// 	useProfileImageUpload,
// } from "@/features/profile/api/profile.hooks"
// import { ImageCropper } from "@/features/profile/components/image-cropper"

export const AvatarForm = () => {
	const { data: session, update: updateSession } = useSession()
	const [isImageCropperOpen, setIsImageCropperOpen] = useState(false)
	const [selectedImage, setSelectedImage] = useState<string | null>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	const utils = trpc.useUtils()
	const profileImageUpload = useProfileImageUpload()
	const { validateAndProcessFile } = useProfileImageSelection()

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) {
			return
		}

		try {
			const { file: validatedFile, preview } = await validateAndProcessFile(file)
			setSelectedFile(validatedFile)
			setSelectedImage(preview)
			setIsImageCropperOpen(true)
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			}
		}
	}

	const handleCropComplete = async (croppedImageData: string) => {
		if (!selectedFile) {
			return
		}

		try {
			// Convert base64 to File for upload
			const response = await fetch(croppedImageData)
			const blob = await response.blob()
			const croppedFile = new File([blob], selectedFile.name, {
				type: selectedFile.type,
			})

			// Upload using the client-side hook
			const result = await profileImageUpload.mutateAsync(croppedFile)

			// Update session with new user data
			await updateSession({
				user: result.user,
			})

			// Invalidate profile queries
			await utils.profile.getSummary.invalidate()
			await utils.profile.getPersonalInformation.invalidate()

			setIsImageCropperOpen(false)
			setSelectedImage(null)
			setSelectedFile(null)
		} catch (error) {
			console.error("Error updating profile picture:", error)
			// Error handling is done in the hook
		}
	}

	return (
		<div className="flex flex-col items-center space-y-4">
			<div className="relative">
				<Profile
					className="!size-40"
					url={session?.user?.image ?? null}
					name={session?.user?.name ?? ""}
				/>
				<Button
					size="sm"
					variant="outline"
					className="absolute -right-2 -bottom-2 h-10 w-10 rounded-full p-0"
					onClick={() => document.getElementById("avatar-upload")?.click()}
					disabled={profileImageUpload.isPending}
				>
					<CameraIcon className="h-5 w-5" />
				</Button>
			</div>

			<Input
				id="avatar-upload"
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFileChange}
				disabled={profileImageUpload.isPending}
			/>

			{selectedImage && (
				<ImageCropper
					imageUrl={selectedImage}
					isOpen={isImageCropperOpen}
					onClose={() => {
						setIsImageCropperOpen(false)
						setSelectedImage(null)
						setSelectedFile(null)
					}}
					onCropComplete={handleCropComplete}
				/>
			)}
		</div>
	)
}
