"use client"

import Image from "next/image"
import { useRef, useState, type SyntheticEvent } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import "react-image-crop/dist/ReactCrop.css"

interface ImageCropperProps {
	imageUrl: string
	isOpen: boolean
	onClose: () => void
	onCropComplete: (croppedImage: string) => void
}

export const ImageCropper = ({ imageUrl, isOpen, onClose, onCropComplete }: ImageCropperProps) => {
	const imgRef = useRef<HTMLImageElement | null>(null)
	const [crop, setCrop] = useState<Crop>()
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

	const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
		const { width, height } = e.currentTarget
		const initialCrop = centerCrop(
			makeAspectCrop(
				{
					unit: "%",
					width: 80,
					x: 10,
					y: 10,
				},
				1, // aspect ratio of 1:1
				width,
				height
			),
			width,
			height
		)
		setCrop(initialCrop)
	}

	const getCroppedImage = () => {
		if (!imgRef.current || !completedCrop) {
			return
		}

		const image = imgRef.current
		const canvas = document.createElement("canvas")
		const ctx = canvas.getContext("2d")
		if (!ctx) {
			return
		}

		const scaleX = image.naturalWidth / image.width
		const scaleY = image.naturalHeight / image.height

		const cropWidth = completedCrop.width * scaleX
		const cropHeight = completedCrop.height * scaleY
		canvas.width = cropWidth
		canvas.height = cropHeight

		const cropX = completedCrop.x * scaleX
		const cropY = completedCrop.y * scaleY

		// Set rendering quality
		ctx.imageSmoothingQuality = "high"

		// Draw the cropped image
		ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

		const base64Image = canvas.toDataURL("image/jpeg", 0.9)
		onCropComplete(base64Image)
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>Crop Profile Picture</DialogTitle>
				</DialogHeader>
				<p className="text-muted-foreground flex-shrink-0 text-sm">
					Adjust the crop area to select your profile picture.
				</p>
				<div className="mt-4 flex-1 overflow-y-auto">
					<ReactCrop
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={c => setCompletedCrop(c)}
						aspect={1}
						circularCrop
					>
						<Image
							ref={imgRef}
							src={imageUrl}
							alt="Crop preview"
							className="max-h-none w-full object-contain"
							onLoad={onImageLoad}
						/>
					</ReactCrop>
				</div>
				<DialogFooter className="mt-4 flex-shrink-0 gap-2 sm:gap-0">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={getCroppedImage}
						disabled={!completedCrop?.width || !completedCrop?.height}
					>
						Apply Crop
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
