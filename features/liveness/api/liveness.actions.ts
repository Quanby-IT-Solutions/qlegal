"use server"

import type { LivenessApiResponse, LivenessValidationRequest } from "../types"

/**
 * Validate selfie for liveness detection
 * This is a mock implementation for testing purposes
 * In production, this would call the actual HyperVerge API
 */
export async function validateSelfie(imageData: string): Promise<{
	success: boolean
	data?: LivenessValidationRequest
	error?: string
}> {
	try {
		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 2000))

		// For testing, we'll simulate a successful response
		// In production, you would:
		// 1. Upload image to your storage (Supabase/S3)
		// 2. Call HyperVerge API with the image URL
		// 3. Return the actual API response

		const mockResponse: LivenessApiResponse = {
			status: "success",
			statusCode: 200,
			metadata: {
				requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				transactionId: `txn-${Date.now()}`,
			},
			result: {
				details: [
					{
						liveFace: {
							value: "yes",
						},
						qualityChecks: {
							eyesClosed: {
								value: "no",
								confidence: "high",
							},
							occlusion: {
								value: "no",
								confidence: "high",
							},
							multipleFaces: {
								value: "no",
								confidence: "high",
							},
						},
					},
				],
				summary: {
					action: "pass",
					details: [],
				},
			},
		}

		const validationData: LivenessValidationRequest = {
			module: "Selfie Validation",
			moduleId: "selfie_validation",
			selfieImageUrl: imageData,
			attempts: 1,
			apiResponse: mockResponse,
			previousAttempts: [],
		}

		return {
			success: true,
			data: validationData,
		}
	} catch (error) {
		console.error("Liveness validation error:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Validation failed",
		}
	}
}

/**
 * Get liveness configuration
 */
export async function getLivenessConfig() {
	return {
		showCaptureInstructions: true,
		disableLiveness: false,
	}
}
