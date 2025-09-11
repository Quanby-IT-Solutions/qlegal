"use client"

import { useCallback, useState } from "react"
import { CameraIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useDropzone, type FileWithPath } from "react-dropzone"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { getInitials } from "@/core/lib/utils"

import type { FileWithPreview } from "@/features/profile/api/profile.types"
import { ImageCropper } from "@/features/profile/components/ui/image-cropper"

const accept = {
	"image/*": [],
}
export const AvatarForm = () => {
	const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
	const [isDialogOpen, setDialogOpen] = useState(false)

	const { data: session } = useSession()
	const initials = getInitials(session?.user?.name)

	const onDrop = useCallback(
		(acceptedFiles: FileWithPath[]) => {
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
		},

		[]
	)

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
				/>
			) : (
				<div className="group relative">
					<Avatar
						{...getRootProps()}
						className="ring-ring ring-offset-border size-36 cursor-pointer ring-2 ring-offset-2"
					>
						<input {...getInputProps()} />
						<AvatarImage src={session?.user.image} alt={initials} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</div>
			)}

			<Button
				{...getRootProps()}
				size="sm"
				variant="outline"
				className="bg-background/80 dark:bg-background/80 dark:hover:bg-background/90 absolute -right-1 -bottom-1 size-10 cursor-pointer rounded-full p-0 backdrop-blur-2xl"
			>
				<input {...getInputProps()} />
				<CameraIcon className="size-5" />
			</Button>
		</div>
	)
}
