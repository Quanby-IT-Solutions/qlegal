"use client"

import { useCallback, useState } from "react"
import type { LivenessApiResponse } from "../types"

export type LivenessFlowStep =
	| "instructions"
	| "capture"
	| "validating"
	| "results"
	| "success"
	| "failed"
	| "max-attempts"

export interface LivenessAttempt {
	attemptNumber: number
	timestamp: Date
	imageData: string
	apiResponse?: LivenessApiResponse
	success: boolean
}

export interface LivenessFlowState {
	currentStep: LivenessFlowStep
	attempts: LivenessAttempt[]
	currentAttempt: number
	maxAttempts: number
	capturedImage: string | null
	validationResult: LivenessApiResponse | null
	error: string | null
	isLoading: boolean
}

const MAX_ATTEMPTS = 3

export function useLivenessFlow() {
	const [state, setState] = useState<LivenessFlowState>({
		currentStep: "instructions",
		attempts: [],
		currentAttempt: 0,
		maxAttempts: MAX_ATTEMPTS,
		capturedImage: null,
		validationResult: null,
		error: null,
		isLoading: false,
	})

	const startFlow = useCallback(() => {
		setState({
			currentStep: "instructions",
			attempts: [],
			currentAttempt: 0,
			maxAttempts: MAX_ATTEMPTS,
			capturedImage: null,
			validationResult: null,
			error: null,
			isLoading: false,
		})
	}, [])

	const goToCapture = useCallback(() => {
		setState(prev => ({
			...prev,
			currentStep: "capture",
			error: null,
		}))
	}, [])

	const goToInstructions = useCallback(() => {
		setState(prev => ({
			...prev,
			currentStep: "instructions",
			error: null,
		}))
	}, [])

	const handleCaptureComplete = useCallback(
		(imageData: string) => {
			setState(prev => ({
				...prev,
				capturedImage: imageData,
				currentStep: "validating",
				isLoading: true,
				error: null,
			}))
		},
		[]
	)

	const handleValidationSuccess = useCallback(
		(apiResponse: LivenessApiResponse) => {
			const newAttempt: LivenessAttempt = {
				attemptNumber: state.currentAttempt + 1,
				timestamp: new Date(),
				imageData: state.capturedImage || "",
				apiResponse,
				success: apiResponse.result.summary.action === "pass",
			}

			const allAttempts = [...state.attempts, newAttempt]
			const newAttemptNumber = state.currentAttempt + 1

			if (apiResponse.result.summary.action === "pass") {
				// Success - liveness check passed
				setState(prev => ({
					...prev,
					validationResult: apiResponse,
					attempts: allAttempts,
					currentAttempt: newAttemptNumber,
					currentStep: "success",
					isLoading: false,
				}))
			} else if (newAttemptNumber >= MAX_ATTEMPTS) {
				// Failed and reached max attempts
				setState(prev => ({
					...prev,
					validationResult: apiResponse,
					attempts: allAttempts,
					currentAttempt: newAttemptNumber,
					currentStep: "max-attempts",
					isLoading: false,
				}))
			} else {
				// Failed but can retry
				setState(prev => ({
					...prev,
					validationResult: apiResponse,
					attempts: allAttempts,
					currentAttempt: newAttemptNumber,
					currentStep: "failed",
					isLoading: false,
				}))
			}
		},
		[state.attempts, state.currentAttempt, state.capturedImage]
	)

	const handleValidationError = useCallback((error: string) => {
		setState(prev => ({
			...prev,
			error,
			currentStep: "failed",
			isLoading: false,
		}))
	}, [])

	const retryCapture = useCallback(() => {
		if (state.currentAttempt >= MAX_ATTEMPTS) {
			setState(prev => ({
				...prev,
				currentStep: "max-attempts",
			}))
			return
		}

		setState(prev => ({
			...prev,
			currentStep: "capture",
			capturedImage: null,
			validationResult: null,
			error: null,
			isLoading: false,
		}))
	}, [state.currentAttempt])

	const reset = useCallback(() => {
		startFlow()
	}, [startFlow])

	return {
		state,
		startFlow,
		goToCapture,
		goToInstructions,
		handleCaptureComplete,
		handleValidationSuccess,
		handleValidationError,
		retryCapture,
		reset,
		canRetry: state.currentAttempt < MAX_ATTEMPTS,
		attemptsRemaining: MAX_ATTEMPTS - state.currentAttempt,
	}
}
