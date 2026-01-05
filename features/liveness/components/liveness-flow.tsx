"use client"

import { useEffect } from "react"
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { useLivenessFlow } from "../hooks/use-liveness-flow"
import { InstructionsScreen } from "./instructions-screen"
import { CameraCapture } from "./camera-capture"
import { ValidationResults } from "./validation-results"
import { validateSelfie } from "../api/liveness.actions"

interface LivenessFlowProps {
	onSuccess?: (data: { imageData: string; transactionId: string }) => void
	onError?: (error: string) => void
	onCancel?: () => void
	showInstructions?: boolean
}

export function LivenessFlow({
	onSuccess,
	onError,
	onCancel,
	showInstructions = true,
}: LivenessFlowProps) {
	const {
		state,
		startFlow,
		goToCapture,
		handleCaptureComplete,
		handleValidationSuccess,
		handleValidationError,
		retryCapture,
		reset,
		canRetry,
		attemptsRemaining,
	} = useLivenessFlow()

	useEffect(() => {
		if (showInstructions) {
			startFlow()
		} else {
			goToCapture()
		}
	}, [showInstructions, startFlow, goToCapture])

	// Handle validation when image is captured
	useEffect(() => {
		if (state.currentStep === "validating" && state.capturedImage) {
			const performValidation = async () => {
				try {
					const result = await validateSelfie(state.capturedImage!)

					if (result.success && result.data) {
						handleValidationSuccess(result.data.apiResponse!)
					} else {
						handleValidationError(result.error || "Validation failed")
						onError?.(result.error || "Validation failed")
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Validation failed"
					handleValidationError(errorMessage)
					onError?.(errorMessage)
				}
			}

			void performValidation()
		}
	}, [state.currentStep, state.capturedImage, handleValidationSuccess, handleValidationError, onError])

	// Handle success callback
	useEffect(() => {
		if (state.currentStep === "success" && state.capturedImage && state.validationResult) {
			onSuccess?.({
				imageData: state.capturedImage,
				transactionId: state.validationResult.metadata.transactionId,
			})
		}
	}, [state.currentStep, state.capturedImage, state.validationResult, onSuccess])

	// Render instructions screen
	if (state.currentStep === "instructions") {
		return <InstructionsScreen onContinue={goToCapture} onSkip={showInstructions ? goToCapture : undefined} />
	}

	// Render camera capture
	if (state.currentStep === "capture") {
		return (
			<div className="space-y-4">
				{/* Attempts indicator */}
				{state.currentAttempt > 0 && (
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Attempt {state.currentAttempt + 1} of {state.maxAttempts}</AlertTitle>
						<AlertDescription>
							{attemptsRemaining} {attemptsRemaining === 1 ? "attempt" : "attempts"} remaining
						</AlertDescription>
					</Alert>
				)}

				<CameraCapture
					onCapture={handleCaptureComplete}
					onError={handleValidationError}
					disabled={state.isLoading}
				/>

				{onCancel && (
					<Button onClick={onCancel} variant="outline" className="w-full">
						Cancel Verification
					</Button>
				)}
			</div>
		)
	}

	// Render validating state
	if (state.currentStep === "validating") {
		return (
			<Card className="w-full border-2 animate-in fade-in duration-500">
				<CardHeader className="text-center pb-4">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
						<Loader2 className="h-8 w-8 text-primary animate-spin" />
					</div>
					<CardTitle className="text-xl">Verifying Your Identity</CardTitle>
					<CardDescription className="text-base">
						Please wait while we validate your selfie...
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Progress value={undefined} className="h-2" />
						<p className="text-sm text-center text-muted-foreground">
							Analyzing image quality and liveness detection
						</p>
					</div>

					{state.capturedImage && (
						<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border-2 border-primary/20">
							<img
								src={state.capturedImage}
								alt="Captured selfie"
								className="h-full w-full object-cover"
							/>
						</div>
					)}
				</CardContent>
			</Card>
		)
	}

	// Render success state
	if (state.currentStep === "success") {
		return (
			<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<Card className="border-2 border-green-500">
					<CardHeader className="text-center pb-4">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto mb-4">
							<CheckCircle2 className="h-10 w-10 text-green-600" />
						</div>
						<CardTitle className="text-2xl text-green-700 dark:text-green-400">
							Verification Successful!
						</CardTitle>
						<CardDescription className="text-base">
							Your identity has been verified. You can now continue.
						</CardDescription>
					</CardHeader>
				</Card>

				{state.capturedImage && state.validationResult && (
					<ValidationResults
						validationData={{
							module: "Selfie Validation",
							moduleId: "selfie_validation",
							selfieImageUrl: state.capturedImage,
							attempts: state.currentAttempt,
							apiResponse: state.validationResult,
							previousAttempts: state.attempts.slice(0, -1),
						}}
						capturedImage={state.capturedImage}
					/>
				)}
			</div>
		)
	}

	// Render failed state (with retry option)
	if (state.currentStep === "failed") {
		return (
			<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<Card className="border-2 border-orange-500">
					<CardHeader className="text-center pb-4">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 mx-auto mb-4">
							<AlertCircle className="h-10 w-10 text-orange-600" />
						</div>
						<CardTitle className="text-2xl text-orange-700 dark:text-orange-400">
							Verification Failed
						</CardTitle>
						<CardDescription className="text-base">
							{state.error || "The selfie didn't pass our quality checks. Please try again."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Attempts Remaining: {attemptsRemaining}</AlertTitle>
							<AlertDescription>
								You can try {attemptsRemaining} more {attemptsRemaining === 1 ? "time" : "times"}.
								Follow the tips below for better results.
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>

				{state.capturedImage && state.validationResult && (
					<ValidationResults
						validationData={{
							module: "Selfie Validation",
							moduleId: "selfie_validation",
							selfieImageUrl: state.capturedImage,
							attempts: state.currentAttempt,
							apiResponse: state.validationResult,
							previousAttempts: state.attempts.slice(0, -1),
						}}
						capturedImage={state.capturedImage}
					/>
				)}

				<div className="flex gap-3">
					{canRetry && (
						<Button onClick={retryCapture} size="lg" className="flex-1">
							Try Again ({attemptsRemaining} left)
						</Button>
					)}
					{onCancel && (
						<Button onClick={onCancel} variant="outline" size="lg">
							Cancel
						</Button>
					)}
				</div>
			</div>
		)
	}

	// Render max attempts reached state
	if (state.currentStep === "max-attempts") {
		return (
			<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<Card className="border-2 border-red-500">
					<CardHeader className="text-center pb-4">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto mb-4">
							<XCircle className="h-10 w-10 text-red-600" />
						</div>
						<CardTitle className="text-2xl text-red-700 dark:text-red-400">
							Maximum Attempts Reached
						</CardTitle>
						<CardDescription className="text-base">
							You've used all {state.maxAttempts} attempts. Please contact support or try again later.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertTitle>Verification Blocked</AlertTitle>
							<AlertDescription>
								For security reasons, you cannot attempt more verifications at this time.
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>

				{state.capturedImage && state.validationResult && (
					<ValidationResults
						validationData={{
							module: "Selfie Validation",
							moduleId: "selfie_validation",
							selfieImageUrl: state.capturedImage,
							attempts: state.currentAttempt,
							apiResponse: state.validationResult,
							previousAttempts: state.attempts.slice(0, -1),
						}}
						capturedImage={state.capturedImage}
					/>
				)}

				<div className="flex gap-3">
					<Button onClick={reset} variant="outline" size="lg" className="flex-1">
						Start Over
					</Button>
					{onCancel && (
						<Button onClick={onCancel} variant="outline" size="lg">
							Cancel
						</Button>
					)}
				</div>
			</div>
		)
	}

	return null
}
