"use server"

import { validateSelfie as validateSelfieAPI } from "@/services/hyperverge"
import type { LivenessApiResponse, LivenessValidationRequest } from "../types"

/**
 * Validate selfie for liveness detection using HyperVerge API
 * Sends base64 image directly to the API
 */
export async function validateSelfie(imageData: string): Promise<{
	success: boolean
	data?: LivenessValidationRequest
	error?: string
}> {
	try {
		// Generate transaction ID
		const transactionId = `selfie-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

		console.log("🔵 Starting selfie validation...")
		console.log("   - Transaction ID:", transactionId)

		// Remove data URL prefix if present (keep only base64)
		const base64Image = imageData.includes("base64,")
			? imageData.split("base64,")[1]!
			: imageData

		// Call HyperVerge API
		const apiResponse = await validateSelfieAPI({
			image: base64Image,
			transactionId,
			showCaptureInstructions: false, // Already shown in our UI
			disableLiveness: false,
		})

		console.log("✅ Validation response received")
		console.log("   - Action:", apiResponse.result.summary.action)

		// Map API response to our data structure
		const validationData: LivenessValidationRequest = {
			module: "Selfie Validation",
			moduleId: "selfie_validation",
			selfieImageUrl: imageData,
			attempts: 1,
			apiResponse: apiResponse as LivenessApiResponse,
			previousAttempts: [],
		}

		return {
			success: true,
			data: validationData,
		}
	} catch (error) {
		console.error("❌ Liveness validation error:", error)
		
		const errorMessage = error instanceof Error 
			? error.message 
			: "Validation failed. Please try again."

		return {
			success: false,
			error: errorMessage,
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
