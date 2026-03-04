"use client"

import { useCallback, useState } from "react"
import { CameraIcon, ChevronLeftIcon } from "lucide-react"
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

interface PhotoStepProps {
	onNext: () => void
	onBack: () => void
}

export function PhotoStep({ onNext, onBack }: PhotoStepProps) {
	const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
	const [isDialogOpen, setDialogOpen] = useState(false)
	const [uploaded, setUploaded] = useState(false)

	const { data: session, update: updateSession } = useSession()
	const { uploadAvatar, isUploading } = useAvatarUpload()
	const updateAvatarMutation = trpc.onboarding.updateAvatar.useMutation()

	const handleCrop = useCallback(
		async (croppedImageDataUrl: string) => {
			try {
				const response = await fetch(croppedImageDataUrl)
				const blob = await response.blob()
				const fallbackName = `${Date.now()}-avatar.png`
				const originalName = (selectedFile as File | null)?.name ?? fallbackName
				const file = new File([blob], originalName, { type: blob.type || "image/png" })

				const path = await uploadAvatar(file)
				await updateAvatarMutation.mutateAsync({ imagePath: path })

				toast.success("Profile photo updated!")
				setSelectedFile(null)
				setDialogOpen(false)
				setUploaded(true)
				await updateSession()
			} catch {
				toast.error("Failed to upload photo. Please try again.")
			}
		},
		[uploadAvatar, updateAvatarMutation, updateSession, selectedFile]
	)

	const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
		const file = acceptedFiles[0]
		if (!file) return

		const fileWithPreview = Object.assign(file, {
			preview: URL.createObjectURL(file),
		})

		setSelectedFile(fileWithPreview)
		setDialogOpen(true)
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "image/*": [] },
		maxFiles: 1,
	})

	const isProcessing = isUploading || updateAvatarMutation.isPending

	return (
		<div>
			<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
				Profile
			</p>
			<h2 className="text-xl font-semibold">Add a profile photo</h2>
			<p className="text-muted-foreground mt-1.5 mb-6 text-sm leading-relaxed">
				Help others recognise you. You can always change this later from your profile
				settings.
			</p>

			{selectedFile ? (
				<ImageCropper
					dialogOpen={isDialogOpen}
					setDialogOpen={setDialogOpen}
					selectedFile={selectedFile}
					setSelectedFile={setSelectedFile}
					onCrop={handleCrop}
					isLoading={isProcessing}
				/>
			) : null}

			{uploaded ? (
				<div className="flex flex-col items-center gap-3 py-4">
					<Profile
						url={session?.user?.image ?? null}
						name={session?.user?.name ?? "User"}
						size="xl"
						className="ring-ring ring-offset-border ring-2 ring-offset-2"
					/>
					<p className="text-muted-foreground text-sm">Looking great!</p>
					<Button
						variant="outline"
						size="sm"
						{...getRootProps()}
					>
						<input {...getInputProps()} />
						Change photo
					</Button>
				</div>
			) : (
				<div
					{...getRootProps()}
					className={cn(
						"flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
						isDragActive
							? "border-primary bg-primary/5"
							: "border-border hover:border-primary/40 hover:bg-muted/30"
					)}
				>
					<input {...getInputProps()} />
					<div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
						<CameraIcon className="text-muted-foreground size-6" />
					</div>
					<p className="text-sm font-medium">
						Drag & drop or click to upload
					</p>
					<p className="text-muted-foreground mt-1 text-xs">
						JPG, PNG or GIF · Max 5 MB
					</p>
				</div>
			)}

			<div className="mt-7 flex items-center justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					<ChevronLeftIcon className="mr-1 size-4" />
					Back
				</Button>
				<div className="flex items-center gap-4">
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
						onClick={onNext}
					>
						Skip for now
					</button>
					<Button onClick={onNext} disabled={isProcessing}>
						Continue
					</Button>
				</div>
			</div>
		</div>
	)
}
