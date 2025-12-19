"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Camera, CheckCircle2, Eye, RotateCw, X } from "lucide-react"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"
import type { CaptureState } from "../types"

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
			setCaptureState(prev => ({ ...prev, error: null, isProcessing: true }))

			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: facingMode,
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: false,
			})

			setStream(mediaStream)
			setCaptureState(prev => ({
				...prev,
				isCapturing: true,
				hasCameraAccess: true,
				isProcessing: false,
			}))

			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream
			}
		} catch (error) {
			console.error("Error accessing camera:", error)
			const errorMessage =
				error instanceof Error && error.name === "NotAllowedError"
					? "Camera access denied. Please allow camera permissions."
					: "Failed to access camera. Please check your device settings."

			setCaptureState(prev => ({
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
		if (videoRef.current) {
			videoRef.current.srcObject = null
		}
		setCaptureState(prev => ({
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

		// Set canvas dimensions to match video
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight

		// Draw video frame to canvas
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

		// Convert to base64 JPEG
		const imageData = canvas.toDataURL("image/jpeg", 0.95)

		setCaptureState(prev => ({
			...prev,
			capturedImage: imageData,
		}))

		// Stop camera after capture
		stopCamera()

		// Send captured image to parent
		onCapture(imageData)
	}, [onCapture, stopCamera])

	// Toggle camera facing mode
	const toggleFacingMode = useCallback(() => {
		stopCamera()
		setFacingMode(prev => (prev === "user" ? "environment" : "user"))
	}, [stopCamera])

	// Start camera when facing mode changes
	useEffect(() => {
		if (captureState.isCapturing && !stream) {
			void startCamera()
		}
	}, [facingMode, captureState.isCapturing, stream, startCamera])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCamera()
		}
	}, [stopCamera])

	return (
		<Card className="w-full border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<CardHeader className="text-center pb-4">
				<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
					<Camera className="h-6 w-6 text-primary" />
				</div>
				<CardTitle className="text-xl">Capture Your Selfie</CardTitle>
				<CardDescription className="text-base">
					Position your face within the guideline and look directly at the camera
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Camera View */}
				{captureState.isCapturing ? (
					<div className="space-y-4">
						{/* Video Preview */}
						<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg border-2 border-primary/20">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="h-full w-full object-cover scale-x-[-1]"
							/>

							{/* Face guideline overlay */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="relative w-56 h-72 border-4 border-primary rounded-full opacity-60 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
									<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-28 h-1 bg-primary/40 rounded-full" />
									{/* Corner guides */}
									<div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
									<div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
									<div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
									<div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
								</div>
							</div>

							{/* Hint Text */}
							<div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
								<div className="bg-black/70 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full">
									Position your face within the oval
								</div>
							</div>

							{/* Capture Button Overlay */}
							<div className="absolute bottom-6 left-1/2 -translate-x-1/2">
								<Button
									size="lg"
									className="h-16 w-16 rounded-full shadow-xl hover:scale-110 transition-transform"
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
								className="flex-1 h-11"
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
				) : (
					<div className="space-y-4">
						{/* Start Camera Button */}
						{!captureState.capturedImage && (
							<div className="aspect-video w-full rounded-xl bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center border-2 border-dashed">
								<div className="text-center p-8">
									<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
										<Camera className="h-10 w-10 text-primary" />
									</div>
									<h3 className="font-semibold text-lg mb-2">Ready to Start?</h3>
									<p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
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
						{captureState.capturedImage && (
							<div className="space-y-3">
								<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border-2 border-primary/20 shadow-lg">
									<img
										src={captureState.capturedImage}
										alt="Captured selfie"
										className="h-full w-full object-cover"
									/>
									<div className="absolute top-3 right-3">
										<div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
											<CheckCircle2 className="h-3 w-3" />
											Captured
										</div>
									</div>
								</div>
								<Button
									onClick={startCamera}
									variant="outline"
									className="w-full h-11"
									size="lg"
									disabled={disabled}
								>
									<Camera className="mr-2 h-4 w-4" />
									Retake Photo
								</Button>
							</div>
						)}
					</div>
				)}

				{/* Tips Card */}
				<Card className="bg-muted/50 border-dashed">
					<CardContent className="pt-4 pb-4">
						<p className="font-medium text-sm mb-2 flex items-center gap-2">
							<Eye className="h-4 w-4 text-primary" />
							Quick Tips for Best Results
						</p>
						<ul className="space-y-1.5 text-xs text-muted-foreground">
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
