"use client"

import React, { type SyntheticEvent } from "react"
import { CropIcon, Trash2Icon } from "lucide-react"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"

import type { FileWithPreview } from "@/features/profile/api/profile.types"

import "react-image-crop/dist/ReactCrop.css"

interface ImageCropperProps {
	dialogOpen: boolean
	setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
	selectedFile: FileWithPreview | null
	setSelectedFile: React.Dispatch<React.SetStateAction<FileWithPreview | null>>
	onCrop?: (croppedImageDataUrl: string) => Promise<void> | void
	isLoading?: boolean
}

export function ImageCropper({
	dialogOpen,
	setDialogOpen,
	selectedFile,
	setSelectedFile,
	onCrop,
	isLoading = false,
}: ImageCropperProps) {
	const aspect = 1

	const imgRef = React.useRef<HTMLImageElement | null>(null)

	const [crop, setCrop] = React.useState<Crop>()
	const [croppedImageUrl, setCroppedImageUrl] = React.useState<string>("")
	const [croppedImage, setCroppedImage] = React.useState<string>("")

	function onImageLoad(e: SyntheticEvent<HTMLImageElement>) {
		if (aspect) {
			const { width, height } = e.currentTarget
			setCrop(centerAspectCrop(width, height, aspect))
		}
	}

	function onCropComplete(crop: PixelCrop) {
		if (imgRef.current && crop.width && crop.height) {
			const croppedImageUrl = getCroppedImg(imgRef.current, crop)
			setCroppedImageUrl(croppedImageUrl)
		}
	}

	function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
		const canvas = document.createElement("canvas")
		const scaleX = image.naturalWidth / image.width
		const scaleY = image.naturalHeight / image.height

		canvas.width = crop.width * scaleX
		canvas.height = crop.height * scaleY

		const ctx = canvas.getContext("2d")

		if (ctx) {
			ctx.imageSmoothingEnabled = false

			ctx.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				crop.width * scaleX,
				crop.height * scaleY,
				0,
				0,
				crop.width * scaleX,
				crop.height * scaleY
			)
		}

		return canvas.toDataURL("image/png", 1.0)
	}

	async function handleCrop() {
		if (!onCrop) {
			setCroppedImage(croppedImageUrl)
			setDialogOpen(false)
			return
		}

		try {
			await onCrop(croppedImageUrl)
			setCroppedImage(croppedImageUrl)
			setDialogOpen(false)
		} catch {
			// Error handling is done by the onCrop function
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger>
				<Avatar className="ring-ring ring-offset-border size-36 cursor-pointer ring-2 ring-offset-2">
					<AvatarImage src={croppedImage ? croppedImage : selectedFile?.preview} alt="@me" />
					<AvatarFallback>You</AvatarFallback>
				</Avatar>
			</DialogTrigger>
			<DialogContent className="gap-0 p-0">
				<DialogHeader className="px-6 pt-6">
					<DialogTitle>Crop Image</DialogTitle>
					<DialogDescription>Select the area you want to crop.</DialogDescription>
				</DialogHeader>
				<div className="size-full p-6">
					<ReactCrop
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={c => onCropComplete(c)}
						aspect={aspect}
						circularCrop
					>
						<Avatar className="size-full rounded-none">
							<AvatarImage
								ref={imgRef}
								className="aspect-auto max-h-none w-full object-contain"
								alt="Image Cropper Shell"
								src={selectedFile?.preview}
								onLoad={onImageLoad}
							/>
							<AvatarFallback className="size-full min-h-[460px] rounded-none">
								Loading...
							</AvatarFallback>
						</Avatar>
					</ReactCrop>
				</div>
				<DialogFooter className="justify-center p-6 pt-0">
					<DialogClose asChild>
						<Button
							size={"sm"}
							type="reset"
							className="w-fit"
							variant={"outline"}
							onClick={() => {
								setSelectedFile(null)
							}}
						>
							<Trash2Icon className="mr-1.5 size-4" />
							Cancel
						</Button>
					</DialogClose>
					<Button
						type="submit"
						size={"sm"}
						className="w-fit"
						onClick={handleCrop}
						disabled={isLoading}
					>
						<CropIcon className="mr-1.5 size-4" />
						{isLoading ? "Uploading..." : "Crop"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

// Helper function to center the crop
export function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 50,
				height: 50,
			},
			aspect,
			mediaWidth,
			mediaHeight
		),
		mediaWidth,
		mediaHeight
	)
}
