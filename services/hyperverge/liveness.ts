/**
 * HyperVerge Liveness Validation Service
 *
 * Provides unified liveness verification supporting:
 * 1. Hosted workflow via redirect/QR (default mode)
 * 2. Direct selfie capture via /checkLiveness API (feature flag mode)
 *
 * Both modes share unified backend decision logic using liveFace.value and summary.action
 *
 * API Documentation: https://documentation.hyperverge.co/
 */

import { env } from "@/env"

// HyperVerge API Configuration
const DEFAULT_BASE_URL = "https://ind.idv.hyperverge.co"
const CONFIGURED_BASE_URL = (env.HYPERVERGE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "")
const FALLBACK_BASE_URL = DEFAULT_BASE_URL

const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""

// Feature flag for direct liveness mode
export const isDirectLivenessEnabled = env.HYPERVERGE_DIRECT_LIVENESS_ENABLED === "true"

/**
 * Validate HyperVerge credentials are configured
 */
function validateCredentials(): void {
	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}
}

/**
 * Unified Liveness Decision Result
 * Shared structure for both hosted workflow and direct API modes
 */
export interface LivenessDecisionResult {
	/** Whether liveness check passed */
	isLive: boolean
	/** Whether the overall action passed */
	actionPassed: boolean
	/** Combined decision: true if both liveness and action passed */
	isApproved: boolean
	/** Human-readable message */
	message: string
	/** Confidence level if available */
	confidence?: "high" | "medium" | "low"
	/** Quality check failures if any */
	qualityIssues: string[]
	/** Raw liveFace.value */
	liveFaceValue: "yes" | "no" | "unknown"
	/** Raw summary.action */
	summaryAction: "pass" | "fail" | "unknown"
}

/**
 * Unified decision logic for liveness validation
 * Used by both hosted workflow results and direct API responses
 *
 * @param liveFaceValue - The liveFace.value from API response ("yes" | "no")
 * @param summaryAction - The summary.action from API response ("pass" | "fail")
 * @param qualityChecks - Optional quality check results
 * @returns Unified decision result
 */
export function makeLivenessDecision(
	liveFaceValue: "yes" | "no" | string | undefined,
	summaryAction: "pass" | "fail" | string | undefined,
	qualityChecks?: {
		eyesClosed?: { value: "yes" | "no"; confidence?: string }
		occlusion?: { value: "yes" | "no"; confidence?: string }
		multipleFaces?: { value: "yes" | "no"; confidence?: string }
	}
): LivenessDecisionResult {
	const isLive = liveFaceValue === "yes"
	const actionPassed = summaryAction === "pass"
	const isApproved = isLive && actionPassed

	const qualityIssues: string[] = []

	if (qualityChecks) {
		if (qualityChecks.eyesClosed?.value === "yes") {
			qualityIssues.push("Eyes appear to be closed")
		}
		if (qualityChecks.occlusion?.value === "yes") {
			qualityIssues.push("Face is partially obscured/occluded")
		}
		if (qualityChecks.multipleFaces?.value === "yes") {
			qualityIssues.push("Multiple faces detected in image")
		}
	}

	let message: string
	if (isApproved) {
		message = "Liveness verification successful. Live face detected with all quality checks passed."
	} else if (!isLive && !actionPassed) {
		message = "Liveness verification failed. No live face detected and quality checks failed."
	} else if (!isLive) {
		message = "Liveness verification failed. The captured image does not appear to be a live face."
	} else if (!actionPassed) {
		message = `Liveness check passed but quality issues detected: ${qualityIssues.join(", ") || "verification criteria not met"}`
	} else {
		message = "Unable to determine liveness status."
	}

	return {
		isLive,
		actionPassed,
		isApproved,
		message,
		qualityIssues,
		liveFaceValue: (liveFaceValue as "yes" | "no") || "unknown",
		summaryAction: (summaryAction as "pass" | "fail") || "unknown",
	}
}

/**
 * Selfie Validation Configuration (Direct API mode)
 */
export interface SelfieValidationConfig {
	/** Base64 encoded selfie image */
	image: string
	/** Transaction ID for tracking */
	transactionId: string
	/** Module configuration */
	showCaptureInstructions?: boolean
	disableLiveness?: boolean
}

/**
 * Response from Selfie Validation API (/checkLiveness)
 * Note: details is an OBJECT, not an array (different from /v1/photo/liveness)
 */
export interface SelfieValidationResponse {
	status: "success" | "error"
	statusCode: number
	metadata: {
		requestId: string
		transactionId: string
	}
	result: {
		details: {
			liveFace: {
				value: "yes" | "no"
				confidence?: "high" | "medium" | "low"
			}
			qualityChecks: {
				eyesClosed: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
				faceOccluded?: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
				occlusion?: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
				multipleFaces: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
				blur?: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
				eyewear?: {
					value: "yes" | "no"
					confidence: "high" | "medium" | "low"
				}
			}
		}
		summary: {
			action: "pass" | "fail"
			details: string[]
		}
	}
	/** Unified decision result (added by our processing) */
	decision?: LivenessDecisionResult
}

/**
 * Check liveness using HyperVerge /v1/checkLiveness API (Direct API mode)
 *
 * This is the direct API mode that captures selfie in-app and sends to HyperVerge
 * for liveness validation. Accepts any transaction ID for tracking purposes.
 *
 * API: POST https://ind.idv.hyperverge.co/v1/checkLiveness
 *
 * @param config - Selfie validation configuration
 * @returns Validation result with liveness check and unified decision
 */
export async function checkLiveness(
	config: SelfieValidationConfig
): Promise<SelfieValidationResponse> {
	console.log("🔵 Checking liveness with HyperVerge /v1/checkLiveness API...")
	console.log("   - Transaction ID:", config.transactionId)
	console.log("   - Mode: Direct API")

	validateCredentials()

	const CHECK_LIVENESS_URL = `${CONFIGURED_BASE_URL}/v1/checkLiveness`
	const CHECK_LIVENESS_URL_FALLBACK = `${FALLBACK_BASE_URL}/v1/checkLiveness`

	// Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
	let base64Image = config.image
	if (base64Image.startsWith("data:")) {
		const parts = base64Image.split(",")
		base64Image = parts[1] || base64Image
	}

	console.log("   - Base64 length:", base64Image.length)

	// Convert base64 to Blob (binary file) - HyperVerge requires multipart/form-data
	const byteCharacters = atob(base64Image)
	const byteNumbers = new Array(byteCharacters.length)
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i)
	}
	const byteArray = new Uint8Array(byteNumbers)
	const imageBlob = new Blob([byteArray], { type: "image/jpeg" })

	console.log("   - Blob size:", imageBlob.size, "bytes")

	// Create FormData with binary image (field name MUST be 'image')
	const formData = new FormData()
	formData.append("image", imageBlob, "selfie.jpg")

	// Add optional parameters if provided
	if (config.showCaptureInstructions !== undefined) {
		formData.append("showCaptureInstructions", String(config.showCaptureInstructions))
	}
	if (config.disableLiveness !== undefined) {
		formData.append("disableLiveness", String(config.disableLiveness))
	}

	console.log(
		"   - FormData entries:",
		Array.from(formData.entries()).map(
			([k, v]) => `${k}: ${v instanceof Blob ? `Blob(${v.size} bytes)` : v}`
		)
	)

	try {
		let response: Response
		try {
			response = await fetch(CHECK_LIVENESS_URL, {
				method: "POST",
				headers: {
					// DO NOT set Content-Type - fetch will set multipart/form-data with boundary automatically
					appId: HYPERVERGE_APP_ID,
					appKey: HYPERVERGE_APP_KEY,
					transactionId: config.transactionId,
				},
				body: formData,
			})
		} catch (networkErr) {
			console.warn("⚠️ Primary checkLiveness API failed (network)", networkErr)
			console.log("   - Trying fallback API URL:", CHECK_LIVENESS_URL_FALLBACK)
			response = await fetch(CHECK_LIVENESS_URL_FALLBACK, {
				method: "POST",
				headers: {
					// DO NOT set Content-Type - fetch will set multipart/form-data with boundary automatically
					appId: HYPERVERGE_APP_ID,
					appKey: HYPERVERGE_APP_KEY,
					transactionId: config.transactionId,
				},
				body: formData,
			})
		}

		const responseText = await response.text()
		console.log("📡 HyperVerge checkLiveness API response status:", response.status)
		console.log("📡 Raw API response:", responseText)

		if (!response.ok) {
			console.error("❌ HyperVerge checkLiveness failed:", responseText)
			throw new Error(`HyperVerge checkLiveness API error: ${response.status} - ${responseText}`)
		}

		const result = JSON.parse(responseText) as SelfieValidationResponse

		if (result.status !== "success") {
			throw new Error(`HyperVerge checkLiveness error: ${JSON.stringify(result)}`)
		}

		console.log("📊 Parsed API result:", {
			status: result.status,
			statusCode: result.statusCode,
			liveFaceValue: result.result?.details?.liveFace?.value,
			liveFaceConfidence: result.result?.details?.liveFace?.confidence,
			summaryAction: result.result?.summary?.action,
		})

		// Apply unified decision logic
		// Note: /v1/checkLiveness returns details as object, not array
		const details = result.result.details
		const decision = makeLivenessDecision(details?.liveFace?.value, result.result.summary?.action, {
			eyesClosed: details?.qualityChecks?.eyesClosed,
			occlusion: details?.qualityChecks?.faceOccluded || details?.qualityChecks?.occlusion,
			multipleFaces: details?.qualityChecks?.multipleFaces,
		})

		console.log("✅ Liveness check completed")
		console.log("   - Live Face:", decision.liveFaceValue)
		console.log("   - Summary Action:", decision.summaryAction)
		console.log("   - Final Decision:", decision.isApproved ? "APPROVED" : "REJECTED")

		return {
			...result,
			decision,
		}
	} catch (error) {
		console.error("❌ Failed to check liveness:", error)
		throw error
	}
}
