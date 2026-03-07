"use client"

import { useCallback, useState } from "react"
import { CameraIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useDropzone, type FileWithPath } from "react-dropzone"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { Profile } from "@/core/components/user-profile"
import { cn } from "@/core/lib/utils"

import type { FileWithPreview } from "@/features/profile/api/profile.types"
import { ImageCropper } from "@/features/profile/components/ui/image-cropper"
import { useAvatarUpload } from "@/features/profile/hooks/use-avatar-upload"

interface PhotoStepProps {
	onNext: () => void
	onBack: () => void
	onSaveImagePath: (imagePath: string) => Promise<void>
	isSaving: boolean
}

export function PhotoStep({ onNext, onBack, onSaveImagePath, isSaving }: PhotoStepProps) {
	const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
	const [isDialogOpen, setDialogOpen] = useState(false)
	const [uploaded, setUploaded] = useState(false)

	const { data: session, update: updateSession } = useSession()
	const { uploadAvatar, isUploading } = useAvatarUpload()

	const handleCrop = useCallback(
		async (croppedImageDataUrl: string) => {
			try {
				const response = await fetch(croppedImageDataUrl)
				const blob = await response.blob()
				const fallbackName = `${Date.now()}-avatar.png`
				const originalName = (selectedFile as File | null)?.name ?? fallbackName
				const file = new File([blob], originalName, { type: blob.type || "image/png" })

				const path = await uploadAvatar(file)
				await onSaveImagePath(path)

				toast.success("Profile photo updated!")
				setSelectedFile(null)
				setDialogOpen(false)
				setUploaded(true)
				await updateSession()
			} catch {
				toast.error("Failed to upload photo. Please try again.")
			}
		},
		[onSaveImagePath, uploadAvatar, updateSession, selectedFile]
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

	const isProcessing = isUploading || isSaving

	// For button state
	const isSubmitting = isProcessing

	return (
		<>
			<CardContent className="px-2!">
				<p className="text-muted-foreground mb-1 text-center text-[11px] font-semibold tracking-wider uppercase">
					Profile Photo
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
				) : uploaded ? (
					<div className="flex flex-col items-center gap-3 py-4">
						<Profile
							url={session?.user?.image ?? null}
							name={session?.user?.name ?? "User"}
							size="xl"
							className="ring-ring ring-offset-border ring-2 ring-offset-2"
						/>
						<p className="text-muted-foreground text-sm">Looking great!</p>
						<Button type="button" variant="outline" size="sm" {...getRootProps()}>
							<input {...getInputProps()} />
							Change photo
						</Button>
					</div>
				) : (
					<div
						{...getRootProps()}
						className={cn(
							"flex flex-col items-center justify-center gap-2 py-6",
							"rounded-xl border-2 border-dashed text-center transition-colors",
							isDragActive
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/40 hover:bg-muted/30"
						)}
					>
						<input {...getInputProps()} />
						<div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-full">
							<CameraIcon className="text-muted-foreground size-6" />
						</div>
						<p className="text-sm font-medium">Drag & drop or click to upload</p>
						<p className="text-muted-foreground mt-1 text-xs">JPG, PNG or GIF · Max 5 MB</p>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onNext}>
					Skip for now
				</Button>
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting} size="sm">
						{isSubmitting ? "Saving…" : "Continue"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
