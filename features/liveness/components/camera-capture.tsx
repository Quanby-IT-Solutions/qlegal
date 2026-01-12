"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CheckCircle2, Eye, RotateCw, X } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

import type { CaptureState } from "@/features/liveness/types"

interface CameraCaptureProps {
	onCapture: (imageData: string) => void
	onError: (error: string) => void
	disabled?: boolean
}

export function CameraCapture({ onCapture, onError, disabled = false }: CameraCaptureProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
	const [captureState, setCaptureState] = useState<CaptureState>({
		isCapturing: false,
		hasCameraAccess: false,
		error: null,
		capturedImage: null,
		isProcessing: false,
	})

	// Start camera
	const startCamera = useCallback(async () => {
		try {
			setCaptureState(prev => ({ ...prev, error: null, isProcessing: true, capturedImage: null }))

			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode,
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: false,
			})

			setStream(mediaStream)
			setCaptureState((prev: CaptureState) => ({
				...prev,
				isCapturing: true,
				hasCameraAccess: true,
				isProcessing: false,
			}))
		} catch (error) {
			console.error("Error accessing camera:", error)
			const errorMessage =
				error instanceof Error && error.name === "NotAllowedError"
					? "Camera access denied. Please allow camera permissions."
					: "Failed to access camera. Please check your device settings."

			setCaptureState((prev: CaptureState) => ({
				...prev,
				error: errorMessage,
				isProcessing: false,
			}))
			onError(errorMessage)
		}
	}, [facingMode, onError])

	// Stop camera
	const stopCamera = useCallback(() => {
		if (stream) {
			stream.getTracks().forEach(track => track.stop())
			setStream(null)
		}
		setCaptureState((prev: CaptureState) => ({
			...prev,
			isCapturing: false,
			hasCameraAccess: false,
		}))
	}, [stream])

	// Capture image from camera
	const captureImage = useCallback(() => {
		if (!videoRef.current || !canvasRef.current) return

		const video = videoRef.current
		const canvas = canvasRef.current
		const ctx = canvas.getContext("2d")

		if (!ctx) return

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

		const imageData = canvas.toDataURL("image/jpeg", 0.95)

		setCaptureState((prev: CaptureState) => ({
			...prev,
			capturedImage: imageData,
		}))

		stopCamera()
		onCapture(imageData)
	}, [onCapture, stopCamera])

	// Toggle camera facing mode
	const toggleFacingMode = useCallback(() => {
		stopCamera()
		setFacingMode(prev => (prev === "user" ? "environment" : "user"))
	}, [stopCamera])

	// Attach stream to video element when stream changes - following VideoSDK pattern
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		if (stream) {
			// Get video tracks to verify stream is valid
			const videoTracks = stream.getVideoTracks()

			if (videoTracks.length > 0) {
				const currentStream = videoElement.srcObject as MediaStream | null
				const currentVideoTracks = currentStream?.getVideoTracks() ?? []
				const currentVideoTrack = currentVideoTracks[0]
				const newVideoTrack = videoTracks[0]

				// Update if track changed or no current stream
				if (!currentVideoTrack || currentVideoTrack.id !== newVideoTrack?.id) {
					videoElement.srcObject = stream

					// Play the video
					videoElement.play().catch((error: unknown) => {
						if (error instanceof Error && error.name !== "AbortError") {
							console.error("Video play error:", error)
						}
					})
				} else if (videoElement.paused) {
					// Same stream but paused - try to play
					videoElement.play().catch(() => {
						// Ignore play errors when resuming paused video
					})
				}
			}
		} else {
			// No stream - clear video
			if (videoElement.srcObject) {
				videoElement.srcObject = null
			}
		}
	}, [stream])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop())
			}
		}
	}, [stream])

	// Determine what to show - following VideoSDK pattern of using CSS visibility
	const showCamera = captureState.isCapturing && !!stream
	const showCapturedImage = !captureState.isCapturing && !!captureState.capturedImage
	const showStartButton = !captureState.isCapturing && !captureState.capturedImage

	return (
		<Card className="animate-in fade-in slide-in-from-bottom-4 w-full border-2 duration-500">
			<CardHeader className="pb-4 text-center">
				<div className="bg-primary/10 mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full">
					<Camera className="text-primary h-6 w-6" />
				</div>
				<CardTitle className="text-xl">Capture Your Selfie</CardTitle>
				<CardDescription className="text-base">
					Position your face within the guideline and look directly at the camera
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Video Element - ALWAYS rendered, visibility controlled by CSS */}
				<div className={cn("space-y-4", !showCamera && "hidden")}>
					<div className="border-primary/20 relative aspect-video w-full overflow-hidden rounded-xl border-2 bg-black shadow-lg">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="h-full w-full scale-x-[-1] object-cover"
						/>

						{/* Face guideline overlay */}
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<div className="border-primary relative h-72 w-56 rounded-full border-4 opacity-60 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
								<div className="bg-primary/40 absolute top-1/3 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full" />
								<div className="border-primary absolute top-4 left-4 h-8 w-8 rounded-tl-lg border-t-4 border-l-4" />
								<div className="border-primary absolute top-4 right-4 h-8 w-8 rounded-tr-lg border-t-4 border-r-4" />
								<div className="border-primary absolute bottom-4 left-4 h-8 w-8 rounded-bl-lg border-b-4 border-l-4" />
								<div className="border-primary absolute right-4 bottom-4 h-8 w-8 rounded-br-lg border-r-4 border-b-4" />
							</div>
						</div>

						{/* Hint Text */}
						<div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2">
							<div className="rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur-sm">
								Position your face within the oval
							</div>
						</div>

						{/* Capture Button Overlay */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2">
							<Button
								size="lg"
								className="h-16 w-16 rounded-full shadow-xl transition-transform hover:scale-110"
								onClick={captureImage}
								disabled={disabled || captureState.isProcessing}
							>
								<Camera className="h-7 w-7" />
							</Button>
						</div>
					</div>

					{/* Controls */}
					<div className="flex gap-3">
						<Button
							onClick={captureImage}
							variant="default"
							className="h-11 flex-1"
							size="lg"
							disabled={disabled || captureState.isProcessing}
						>
							<Camera className="mr-2 h-4 w-4" />
							Capture Photo
						</Button>
						<Button
							onClick={toggleFacingMode}
							variant="outline"
							size="icon"
							className="h-11 w-11"
							title="Switch Camera"
						>
							<RotateCw className="h-5 w-5" />
						</Button>
						<Button
							onClick={stopCamera}
							variant="outline"
							size="icon"
							className="h-11 w-11"
							title="Stop Camera"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Start Camera Button */}
				{showStartButton && (
					<div className="from-muted/50 to-muted flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed bg-gradient-to-br">
						<div className="p-8 text-center">
							<div className="bg-primary/10 mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full">
								<Camera className="text-primary h-10 w-10" />
							</div>
							<h3 className="mb-2 text-lg font-semibold">Ready to Start?</h3>
							<p className="text-muted-foreground mx-auto mb-6 max-w-xs text-sm">
								Click below to activate your camera and begin the verification process
							</p>
							<Button
								onClick={startCamera}
								disabled={disabled || captureState.isProcessing}
								size="lg"
								className="h-12"
							>
								<Camera className="mr-2 h-5 w-5" />
								{captureState.isProcessing ? "Starting Camera..." : "Activate Camera"}
							</Button>
						</div>
					</div>
				)}

				{/* Captured Image Preview */}
				{showCapturedImage && captureState.capturedImage && (
					<div className="space-y-3">
						<div className="border-primary/20 relative aspect-video w-full overflow-hidden rounded-xl border-2 bg-black shadow-lg">
							<Image
								src={captureState.capturedImage}
								alt="Captured selfie"
								fill
								className="object-cover"
								unoptimized
							/>
							<div className="absolute top-3 right-3">
								<div className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white">
									<CheckCircle2 className="h-3 w-3" />
									Captured
								</div>
							</div>
						</div>
						<Button
							onClick={startCamera}
							variant="outline"
							className="h-11 w-full"
							size="lg"
							disabled={disabled}
						>
							<Camera className="mr-2 h-4 w-4" />
							Retake Photo
						</Button>
					</div>
				)}

				{/* Tips Card */}
				<Card className="bg-muted/50 border-dashed">
					<CardContent className="pt-4 pb-4">
						<p className="mb-2 flex items-center gap-2 text-sm font-medium">
							<Eye className="text-primary h-4 w-4" />
							Quick Tips for Best Results
						</p>
						<ul className="text-muted-foreground space-y-1.5 text-xs">
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>Ensure good lighting on your face</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>Remove glasses, sunglasses, or hats</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>Look directly at the camera with eyes open</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>Keep your face within the oval guideline</span>
							</li>
						</ul>
					</CardContent>
				</Card>

				{/* Hidden canvas for image capture */}
				<canvas ref={canvasRef} className="hidden" />
			</CardContent>
		</Card>
	)
}
