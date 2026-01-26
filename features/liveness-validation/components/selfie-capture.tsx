"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
	Camera,
	CameraOff,
	CheckCircle2,
	FlipHorizontal,
	Loader2,
	RefreshCw,
	XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"

import { validateSelfieLiveness } from "@/features/liveness-validation/api/liveness.actions"
import { getLivenessFailureCopy } from "@/features/liveness-validation/lib/liveness-failure-copy"

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
	meetingId?: string
}

export function SelfieCapture({ onSuccess, onError, onCancel, meetingId }: SelfieCaptureProps) {
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

	const isApproved = validationResult?.decision?.isApproved === true
	const hasValidationResult = validationResult !== null
	const canStartCamera = !cameraActive && !capturedImage
	const failureCopy = getLivenessFailureCopy({
		message: validationResult?.decision?.message ?? validationResult?.message,
		qualityIssues: validationResult?.decision?.qualityIssues,
	})

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
			setCameraError("Camera access is blocked. Please allow camera permissions and try again.")
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

	// Always stop the camera on unmount
	useEffect(() => {
		return () => stopCamera()
	}, [stopCamera])

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
				const result = await validateSelfieLiveness(capturedImage, meetingId)

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
						toast.error("We couldn’t confirm your liveness. Please retake and try again.")
						onError?.(result.data.decision.message || "Verification failed")
					}
				} else {
					setValidationResult({
						success: false,
						message: result.error || "Validation failed",
					})
					toast.error("We couldn’t confirm your liveness. Please retake and try again.")
					onError?.(result.error || "Validation failed")
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
				setValidationResult({
					success: false,
					message: errorMessage,
				})
				toast.error("We couldn’t confirm your liveness. Please retake and try again.")
				onError?.(errorMessage)
			}
		})
	}, [capturedImage, meetingId, onSuccess, onError])

	// Cancel and go back
	const handleCancel = useCallback(() => {
		stopCamera()
		onCancel?.()
	}, [stopCamera, onCancel])

	return (
		<div className="space-y-4">
			{/* Instructions */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
				<p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
					Live Selfie Capture
				</p>
				<ul className="list-inside list-disc space-y-1 text-xs text-blue-700 dark:text-blue-300">
					<li>Ensure good lighting on your face</li>
					<li>Remove glasses, hats, or face coverings</li>
					<li>Look directly at the camera</li>
					<li>Keep your face centered in the frame</li>
					<li>Stay still when capturing</li>
				</ul>
			</div>

			{/* Camera View / Captured Image */}
			<div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-black">
				{/* Video Preview */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={`absolute inset-0 h-full w-full object-cover ${
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
						className="absolute inset-0 h-full w-full object-cover"
					/>
				)}

				{/* Camera Inactive Placeholder */}
				{!cameraActive && !capturedImage && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
						<CameraOff className="mb-4 size-12 text-gray-400" />
						<p className="text-sm text-gray-400">Camera is not active</p>
						{cameraError && (
							<p className="mt-2 px-4 text-center text-xs text-red-400">{cameraError}</p>
						)}
					</div>
				)}

				{/* Face Guide Overlay */}
				{cameraActive && !capturedImage && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="h-64 w-48 rounded-full border-2 border-white/50" />
					</div>
				)}

				{/* Camera Controls Overlay */}
				{cameraActive && !capturedImage && (
					<div className="absolute right-0 bottom-4 left-0 flex justify-center gap-4">
						<Button
							onClick={flipCamera}
							variant="secondary"
							size="icon"
							className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
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
							<Camera className="mr-2 h-5 w-5" />
							Capture
						</Button>
					</div>
				)}

				{/* Processing Overlay */}
				{isPending && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
						<Loader2 className="mb-4 size-10 animate-spin text-white" />
						<p className="text-sm text-white">Validating liveness...</p>
						<p className="mt-1 text-xs text-white/70">This may take a few seconds</p>
					</div>
				)}
			</div>

			{/* Validation Result */}
			{validationResult && (
				<div
					className={`rounded-lg border p-4 ${
						validationResult.success && validationResult.decision?.isApproved
							? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
							: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
					}`}
				>
					<div className="flex items-start gap-3">
						{validationResult.success && validationResult.decision?.isApproved ? (
							<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
						) : (
							<XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
						)}
						<div className="flex-1">
							<p
								className={`mb-1 font-medium ${
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
								{validationResult.success && validationResult.decision?.isApproved
									? "Your liveness was verified successfully."
									: failureCopy.description}
							</p>
							{!isApproved && (
								<ul className="mt-2 list-inside list-disc text-xs text-red-600 dark:text-red-400">
									{failureCopy.tips.map(tip => (
										<li key={tip}>{tip}</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex flex-col gap-3 sm:flex-row">
				{canStartCamera && (
					<>
						<Button onClick={startCamera} className="w-full sm:flex-1" size="lg">
							<Camera className="mr-2 h-5 w-5" />
							Start Camera
						</Button>
						{onCancel && (
							<Button onClick={handleCancel} className="w-full sm:w-auto" variant="outline" size="lg">
								Cancel
							</Button>
						)}
					</>
				)}

				{capturedImage && !isApproved && (
					<>
						<Button
							onClick={retakePhoto}
							variant={hasValidationResult ? "default" : "outline"}
							className="w-full sm:flex-1"
							size="lg"
							disabled={isPending}
						>
							<RefreshCw className="mr-2 h-5 w-5" />
							{hasValidationResult ? "Retake Photo" : "Retake"}
						</Button>
						<Button
							onClick={submitForValidation}
							variant={hasValidationResult ? "outline" : "default"}
							className="w-full sm:flex-1"
							size="lg"
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Validating...
								</>
							) : (
								<>
									<CheckCircle2 className="mr-2 h-5 w-5" />
									{hasValidationResult ? "Verify Again" : "Verify Liveness"}
								</>
							)}
						</Button>
					</>
				)}
			</div>
		</div>
	)
}
