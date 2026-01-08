"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import { Camera, CameraOff, FlipHorizontal, Loader2, RefreshCw, XCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { validateSelfieLiveness } from "@/features/liveness-validation/api/liveness.actions"

interface LivenessDecisionResult {
	isLive: boolean
	actionPassed: boolean
	isApproved: boolean
	message: string
	qualityIssues: string[]
	liveFaceValue: "yes" | "no" | "unknown"
	summaryAction: "pass" | "fail" | "unknown"
}

interface SelfieCaptureProps {
	onSuccess?: (result: {
		transactionId: string
		status: string
		decision: LivenessDecisionResult
	}) => void
	onError?: (error: string) => void
	onCancel?: () => void
}

export function SelfieCapture({ onSuccess, onError, onCancel }: SelfieCaptureProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const streamRef = useRef<MediaStream | null>(null)

	const [isPending, startTransition] = useTransition()
	const [cameraActive, setCameraActive] = useState(false)
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [capturedImage, setCapturedImage] = useState<string | null>(null)
	const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
	const [validationResult, setValidationResult] = useState<{
		success: boolean
		decision?: LivenessDecisionResult
		message?: string
	} | null>(null)

	// Start camera
	const startCamera = useCallback(async () => {
		try {
			setCameraError(null)
			setCapturedImage(null)
			setValidationResult(null)

			// Stop any existing stream
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop())
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode,
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: false,
			})

			streamRef.current = stream

			if (videoRef.current) {
				videoRef.current.srcObject = stream
				await videoRef.current.play()
				setCameraActive(true)
			}
		} catch (error) {
			console.error("Camera error:", error)
			setCameraError(
				error instanceof Error
					? error.message
					: "Failed to access camera. Please ensure camera permissions are granted."
			)
			setCameraActive(false)
		}
	}, [facingMode])

	// Stop camera
	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop())
			streamRef.current = null
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null
		}
		setCameraActive(false)
	}, [])

	// Flip camera
	const flipCamera = useCallback(() => {
		setFacingMode(prev => (prev === "user" ? "environment" : "user"))
		if (cameraActive) {
			stopCamera()
			// Small delay before restarting with new facing mode
			setTimeout(() => startCamera(), 100)
		}
	}, [cameraActive, stopCamera, startCamera])

	// Capture selfie
	const captureImage = useCallback(() => {
		if (!videoRef.current || !canvasRef.current) return

		const video = videoRef.current
		const canvas = canvasRef.current
		const context = canvas.getContext("2d")

		if (!context) return

		// Set canvas size to match video
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight

		// Draw the current video frame
		if (facingMode === "user") {
			// Mirror the image for front camera
			context.save()
			context.scale(-1, 1)
			context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
			context.restore()
		} else {
			context.drawImage(video, 0, 0, canvas.width, canvas.height)
		}

		// Get base64 image
		const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)
		setCapturedImage(imageDataUrl)
		stopCamera()
	}, [facingMode, stopCamera])

	// Retake photo
	const retakePhoto = useCallback(() => {
		setCapturedImage(null)
		setValidationResult(null)
		startCamera()
	}, [startCamera])

	// Submit selfie for liveness validation
	const submitForValidation = useCallback(() => {
		if (!capturedImage) return

		startTransition(async () => {
			try {
				const result = await validateSelfieLiveness(capturedImage)

				if (result.success && result.data) {
					setValidationResult({
						success: true,
						decision: result.data.decision,
					})

					if (result.data.decision.isApproved) {
						toast.success("Liveness verification successful!")
						onSuccess?.({
							transactionId: result.data.transactionId,
							status: result.data.status,
							decision: result.data.decision,
						})
					} else {
						toast.error(result.data.decision.message || "Liveness verification failed")
						onError?.(result.data.decision.message || "Verification failed")
					}
				} else {
					setValidationResult({
						success: false,
						message: result.error || "Validation failed",
					})
					toast.error(result.error || "Validation failed")
					onError?.(result.error || "Validation failed")
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
				setValidationResult({
					success: false,
					message: errorMessage,
				})
				toast.error(errorMessage)
				onError?.(errorMessage)
			}
		})
	}, [capturedImage, onSuccess, onError])

	// Cancel and go back
	const handleCancel = useCallback(() => {
		stopCamera()
		onCancel?.()
	}, [stopCamera, onCancel])

	return (
		<div className="space-y-4">
			{/* Instructions */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
				<p className="text-blue-900 dark:text-blue-100 text-sm font-medium mb-2">
					📷 Live Selfie Capture
				</p>
				<ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1 list-disc list-inside">
					<li>Ensure good lighting on your face</li>
					<li>Remove glasses, hats, or face coverings</li>
					<li>Look directly at the camera</li>
					<li>Keep your face centered in the frame</li>
					<li>Stay still when capturing</li>
				</ul>
			</div>

			{/* Camera View / Captured Image */}
			<div className="relative aspect-[4/3] w-full bg-black rounded-lg overflow-hidden">
				{/* Video Preview */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={`absolute inset-0 w-full h-full object-cover ${
						capturedImage ? "hidden" : ""
					} ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
				/>

				{/* Hidden Canvas for Capture */}
				<canvas ref={canvasRef} className="hidden" />

				{/* Captured Image Preview */}
				{capturedImage && (
					<img
						src={capturedImage}
						alt="Captured selfie"
						className="absolute inset-0 w-full h-full object-cover"
					/>
				)}

				{/* Camera Inactive Placeholder */}
				{!cameraActive && !capturedImage && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
						<CameraOff className="h-12 w-12 mb-4 text-gray-400" />
						<p className="text-gray-400 text-sm">Camera is not active</p>
						{cameraError && (
							<p className="text-red-400 text-xs mt-2 px-4 text-center">{cameraError}</p>
						)}
					</div>
				)}

				{/* Face Guide Overlay */}
				{cameraActive && !capturedImage && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="w-48 h-64 border-2 border-white/50 rounded-full" />
					</div>
				)}

				{/* Camera Controls Overlay */}
				{cameraActive && !capturedImage && (
					<div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
						<Button
							onClick={flipCamera}
							variant="secondary"
							size="icon"
							className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur"
							title="Flip camera"
						>
							<FlipHorizontal className="h-5 w-5 text-white" />
						</Button>
						<Button
							onClick={captureImage}
							variant="default"
							size="lg"
							className="rounded-full px-8"
						>
							<Camera className="h-5 w-5 mr-2" />
							Capture
						</Button>
					</div>
				)}

				{/* Processing Overlay */}
				{isPending && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
						<Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
						<p className="text-white text-sm">Validating liveness...</p>
						<p className="text-white/70 text-xs mt-1">This may take a few seconds</p>
					</div>
				)}
			</div>

			{/* Validation Result */}
			{validationResult && (
				<div
					className={`rounded-lg border p-4 ${
						validationResult.success && validationResult.decision?.isApproved
							? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
							: "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
					}`}
				>
					<div className="flex items-start gap-3">
						{validationResult.success && validationResult.decision?.isApproved ? (
							<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
						) : (
							<XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						)}
						<div className="flex-1">
							<p
								className={`font-medium mb-1 ${
									validationResult.success && validationResult.decision?.isApproved
										? "text-green-900 dark:text-green-100"
										: "text-red-900 dark:text-red-100"
								}`}
							>
								{validationResult.success && validationResult.decision?.isApproved
									? "Verification Successful"
									: "Verification Failed"}
							</p>
							<p
								className={`text-sm ${
									validationResult.success && validationResult.decision?.isApproved
										? "text-green-700 dark:text-green-300"
										: "text-red-700 dark:text-red-300"
								}`}
							>
								{validationResult.decision?.message || validationResult.message}
							</p>
							{validationResult.decision?.qualityIssues &&
								validationResult.decision.qualityIssues.length > 0 && (
									<ul className="text-red-600 dark:text-red-400 text-xs mt-2 list-disc list-inside">
										{validationResult.decision.qualityIssues.map((issue, idx) => (
											<li key={idx}>{issue}</li>
										))}
									</ul>
								)}
						</div>
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex gap-3">
				{!cameraActive && !capturedImage && (
					<>
						<Button onClick={startCamera} className="flex-1" size="lg">
							<Camera className="mr-2 h-5 w-5" />
							Start Camera
						</Button>
						{onCancel && (
							<Button onClick={handleCancel} variant="outline" size="lg">
								Cancel
							</Button>
						)}
					</>
				)}

				{capturedImage && !validationResult?.decision?.isApproved && (
					<>
						<Button
							onClick={retakePhoto}
							variant="outline"
							className="flex-1"
							disabled={isPending}
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retake
						</Button>
						<Button
							onClick={submitForValidation}
							className="flex-1"
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Validating...
								</>
							) : (
								<>
									<CheckCircle2 className="mr-2 h-4 w-4" />
									Verify Liveness
								</>
							)}
						</Button>
					</>
				)}

				{validationResult && !validationResult.decision?.isApproved && (
					<Button onClick={retakePhoto} className="w-full" size="lg" disabled={isPending}>
						<RefreshCw className="mr-2 h-5 w-5" />
						Try Again
					</Button>
				)}
			</div>
		</div>
	)
}
