/**
 * HyperVerge Liveness Validation Service
 *
 *
 * Provides unified liveness verification supporting:
 * 1. Hosted workflow via redirect/QR (default mode)
 * 2. Direct selfie capture via /checkLiveness API (feature flag mode)
 *
 *
 * Both modes share unified backend decision logic using liveFace.value and summary.action
 *
 * API Documentation: https://documentation.hyperverge.co/
 */

import { env } from "@/env"

// HyperVerge API Configuration
const DEFAULT_BASE_URL = "https://ind.idv.hyperverge.co"
const CONFIGURED_BASE_URL = (() => {
	const raw = (env.HYPERVERGE_API_URL || DEFAULT_BASE_URL).trim()
	// We've seen configs using a non-resolving staging domain. Prefer the known-good base URL.
	if (raw === "https://staging.ind.idv.hyperverge.co") return DEFAULT_BASE_URL
	return raw.replace(/\/$/, "")
})()
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
 * @param liveFaceValue - The liveFace.value from API response (e.g. "yes", "no", "unknown")
 * @param summaryAction - The summary.action from API response (e.g. "pass", "fail")
 * @param qualityChecks - Optional quality check results
 * @returns Unified decision result
 */
export function makeLivenessDecision(
	liveFaceValue: string | undefined,
	summaryAction: string | undefined,
	qualityChecks?: {
		eyesClosed?: { value: "yes" | "no"; confidence?: string }
		occlusion?: { value: "yes" | "no"; confidence?: string }
		multipleFaces?: { value: "yes" | "no"; confidence?: string }
	}
): LivenessDecisionResult {
	// If liveFace value is not provided but summary action is pass, trust the summary
	const isLive =
		liveFaceValue === "yes" || (liveFaceValue === "unknown" && summaryAction === "pass")
	const actionPassed = summaryAction === "pass"
	const isApproved = actionPassed // Trust HyperVerge's overall decision

	// Collect quality issues
	const qualityIssues: string[] = []
	if (qualityChecks) {
		if (qualityChecks.eyesClosed?.value === "yes") {
			qualityIssues.push("Eyes closed detected")
		}
		if (qualityChecks.occlusion?.value === "yes") {
			qualityIssues.push("Face occlusion detected")
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
 * Hosted Workflow Configuration (Onboard Links API)
 */
export interface HostedWorkflowConfig {
	/** Workflow ID (e.g., "workflow_liveness") */
	workflowId: string
	/** Transaction ID for tracking */
	transactionId: string
	/** URL to redirect user after completion */
	redirectUrl: string
	/**
	 * Optional workflow inputs (only if your workflow requires inputsRequired keys).
	 * See onboard-links docs: /v1/link-kyc/start "inputs"
	 */
	inputs?: Record<string, unknown>
	/** Validate and enforce workflow inputs (docs: "yes" | "no") */
	validateWorkflowInputs?: "yes" | "no"
	/**
	 * When validateWorkflowInputs is "yes", this allows empty strings to satisfy required inputs.
	 * Useful for workflows that require presence but will populate later in-journey.
	 */
	allowEmptyWorkflowInputs?: "yes" | "no"
	/** Forces launching the SDK even if the link previously ended (docs: "yes" | "no") */
	forceLaunchSDK?: "yes" | "no"
}

/**
 * Response from Hosted Workflow Start API (/v1/link-kyc/start)
 */
export interface HostedWorkflowResponse {
	status: "success" | "failure" | "error"
	statusCode?: number
	metadata?: { requestId: string }
	result?: {
		/** URL to redirect user to HyperVerge hosted page */
		startKycUrl?: string
		error?: string
	}
}

function parseHyperVergeErrorMessage(responseText: string): string {
	try {
		const parsed = JSON.parse(responseText) as HostedWorkflowResponse
		const err = parsed?.result?.error
		if (typeof err === "string" && err.trim()) return err
	} catch {
		// ignore
	}
	return responseText
}

/**
 * Output API Response (from /v1/output)
 * Called once after webhook notification or user redirect
 *
 * Note: The actual API returns result.status ("auto_approved", "auto_declined", "needs_review")
 * instead of the nested summary/details structure
 */
export interface OutputAPIResponse {
	status: "success" | "error"
	statusCode: number
	metadata?: {
		requestId: string
	}
	result: {
		/** Overall status from HyperVerge workflow (e.g. auto_approved, auto_declined, needs_review) */
		status: string
		transactionId: string
		/** Optional: May contain summary and details for some workflows */
		summary?: {
			action: "pass" | "fail"
			details: string[]
		}
		details?: Array<{
			module: string
			attempts: Array<{
				liveFace?: {
					value: "yes" | "no"
					confidence?: "high" | "medium" | "low"
				}
				qualityChecks?: {
					eyesClosed?: { value: "yes" | "no"; confidence?: string }
					occlusion?: { value: "yes" | "no"; confidence?: string }
					multipleFaces?: { value: "yes" | "no"; confidence?: string }
				}
			}>
		}>
	}
	/** Unified decision result (added by our processing) */
	decision?: LivenessDecisionResult
}

/**
 * Map HyperVerge workflow status to action (pass/fail)
 * @param status - The result.status from /v1/output API
 */
function mapStatusToAction(status: string | undefined): "pass" | "fail" | "unknown" {
	if (!status) return "unknown"

	const statusLower = status.toLowerCase()
	if (statusLower.includes("approved") || statusLower === "pass") {
		return "pass"
	}
	if (
		statusLower.includes("declined") ||
		statusLower.includes("rejected") ||
		statusLower === "fail"
	) {
		return "fail"
	}

	// For "needs_review" or unknown statuses, treat as fail for safety
	return "fail"
}

/**
 * Start hosted workflow using HyperVerge Onboard Links API
 *
 * This creates a HyperVerge-hosted page for liveness verification.
 * User is redirected to HyperVerge, completes verification, then redirected back.
 * Results are delivered via webhook or retrieved via /v1/output API.
 *
 * API: POST https://ind.idv.hyperverge.co/v1/link-kyc/start
 *
 * Note: Despite the "kyc" name, this works for ANY workflow including workflow_liveness
 *
 * @param config - Hosted workflow configuration
 * @returns Response with startKycUrl for redirect
 */
export async function startHostedWorkflow(
	config: HostedWorkflowConfig
): Promise<HostedWorkflowResponse> {
	console.log("🔵 Starting hosted workflow with HyperVerge...")
	console.log("   - Workflow ID:", config.workflowId)
	console.log("   - Transaction ID:", config.transactionId)
	console.log("   - Redirect URL:", config.redirectUrl)

	validateCredentials()

	const LINK_KYC_URL = `${CONFIGURED_BASE_URL}/v1/link-kyc/start`
	const LINK_KYC_URL_FALLBACK = `${FALLBACK_BASE_URL}/v1/link-kyc/start`

	const requestBody = {
		workflowId: config.workflowId,
		transactionId: config.transactionId,
		redirectUrl: config.redirectUrl,
		...(config.inputs ? { inputs: config.inputs } : {}),
		...(config.validateWorkflowInputs
			? { validateWorkflowInputs: config.validateWorkflowInputs }
			: {}),
		...(config.allowEmptyWorkflowInputs
			? { allowEmptyWorkflowInputs: config.allowEmptyWorkflowInputs }
			: {}),
		...(config.forceLaunchSDK ? { forceLaunchSDK: config.forceLaunchSDK } : {}),
	} satisfies Record<string, unknown>

	try {
		let response: Response
		try {
			response = await fetch(LINK_KYC_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"appId": HYPERVERGE_APP_ID,
					"appKey": HYPERVERGE_APP_KEY,
				},
				body: JSON.stringify(requestBody),
			})
		} catch (networkErr) {
			console.warn("⚠️ Primary link-kyc API failed (network)", networkErr)
			console.log("   - Trying fallback API URL:", LINK_KYC_URL_FALLBACK)
			response = await fetch(LINK_KYC_URL_FALLBACK, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"appId": HYPERVERGE_APP_ID,
					"appKey": HYPERVERGE_APP_KEY,
				},
				body: JSON.stringify(requestBody),
			})
		}

		const responseText = await response.text()
		console.log("📡 HyperVerge link-kyc API response status:", response.status)
		console.log("📡 Raw API response:", responseText)

		if (!response.ok) {
			const msg = parseHyperVergeErrorMessage(responseText)
			console.error("❌ HyperVerge link-kyc failed:", msg)
			throw new Error(`HyperVerge link-kyc API error: ${response.status} - ${msg}`)
		}

		const result = JSON.parse(responseText) as HostedWorkflowResponse

		const startUrl = result.result?.startKycUrl
		if (result.status !== "success" || !startUrl) {
			const rawError = result.result?.error
			const msg =
				typeof rawError === "string" && rawError.length > 0
					? rawError
					: `Unexpected response: ${JSON.stringify(result)}`
			throw new Error(`HyperVerge link-kyc error: ${msg}`)
		}

		console.log("✅ Hosted workflow started successfully")
		console.log("   - Start URL:", startUrl)

		return result
	} catch (error) {
		console.error("❌ Failed to start hosted workflow:", error)
		throw error
	}
}

/**
 * Get workflow results using HyperVerge Output API
 *
 * Call this ONCE after receiving webhook notification or user redirect.
 * Do NOT poll this endpoint repeatedly.
 *
 * API: POST https://ind.idv.hyperverge.co/v1/output
 *
 * @param transactionId - Transaction ID to get results for
 * @returns Output result with unified decision
 */
export async function getWorkflowOutput(transactionId: string): Promise<OutputAPIResponse> {
	console.log("🔵 Fetching workflow output from HyperVerge...")
	console.log("   - Transaction ID:", transactionId)

	validateCredentials()

	const OUTPUT_URL = `${CONFIGURED_BASE_URL}/v1/output`
	const OUTPUT_URL_FALLBACK = `${FALLBACK_BASE_URL}/v1/output`

	const requestBody = {
		transactionId,
		// Helpful for diagnosing hosted workflow failures (adds debugInfo.latestModule on error/user_cancelled)
		sendDebugInfo: "yes",
	}

	try {
		let response: Response
		try {
			response = await fetch(OUTPUT_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"appId": HYPERVERGE_APP_ID,
					"appKey": HYPERVERGE_APP_KEY,
				},
				body: JSON.stringify(requestBody),
			})
		} catch (networkErr) {
			console.warn("⚠️ Primary output API failed (network)", networkErr)
			console.log("   - Trying fallback API URL:", OUTPUT_URL_FALLBACK)
			response = await fetch(OUTPUT_URL_FALLBACK, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"appId": HYPERVERGE_APP_ID,
					"appKey": HYPERVERGE_APP_KEY,
				},
				body: JSON.stringify(requestBody),
			})
		}

		const responseText = await response.text()
		console.log("📡 HyperVerge output API response status:", response.status)
		console.log("📡 Raw API response:", responseText)

		if (!response.ok) {
			console.error("❌ HyperVerge output failed:", responseText)
			throw new Error(`HyperVerge output API error: ${response.status} - ${responseText}`)
		}

		const result = JSON.parse(responseText) as OutputAPIResponse

		if (result.status !== "success") {
			throw new Error(`HyperVerge output error: ${JSON.stringify(result)}`)
		}

		console.log("📊 Parsed output result:", {
			status: result.status,
			statusCode: result.statusCode,
			resultStatus: result.result?.status,
			summaryAction: result.result?.summary?.action,
			detailsCount: result.result?.details?.length ?? 0,
		})

		// Log the full result for debugging
		console.log("📊 Full output result:", JSON.stringify(result.result, null, 2))

		// Extract liveness data from details array (if available)
		let liveFaceValue: "yes" | "no" | "unknown" = "unknown"
		let qualityChecks:
			| {
					eyesClosed?: { value: "yes" | "no"; confidence?: string }
					occlusion?: { value: "yes" | "no"; confidence?: string }
					multipleFaces?: { value: "yes" | "no"; confidence?: string }
			  }
			| undefined = undefined

		if (result.result?.details && Array.isArray(result.result.details)) {
			console.log("🔍 Processing", result.result.details.length, "detail modules")
			for (const detail of result.result.details) {
				console.log("   - Module:", detail.module, "Attempts:", detail.attempts?.length ?? 0)
				if (detail.attempts && Array.isArray(detail.attempts)) {
					for (const attempt of detail.attempts) {
						console.log("     - Attempt data:", Object.keys(attempt))
						if (attempt.liveFace) {
							liveFaceValue = attempt.liveFace.value
							qualityChecks = attempt.qualityChecks
							console.log("✅ Found liveFace data:", { liveFaceValue, qualityChecks })
							break
						}
					}
					if (liveFaceValue !== "unknown") break
				}
			}
		}

		// Determine action from result.status or result.summary.action
		const actionFromStatus = mapStatusToAction(result.result?.status)
		const actionFromSummary = result.result?.summary?.action
		const finalAction = actionFromSummary ?? actionFromStatus

		console.log("📊 Action determination:", {
			resultStatus: result.result?.status,
			actionFromStatus,
			actionFromSummary,
			finalAction,
		})

		if (liveFaceValue === "unknown" && finalAction !== "unknown") {
			console.log("ℹ️ No liveFace details in response, using result.status for decision")
		}

		// Apply unified decision logic
		const decision = makeLivenessDecision(liveFaceValue, finalAction, qualityChecks)

		console.log("✅ Output fetch completed")
		console.log("   - Live Face:", decision.liveFaceValue)
		console.log("   - Summary Action:", decision.summaryAction)
		console.log("   - Final Decision:", decision.isApproved ? "APPROVED" : "REJECTED")

		return {
			...result,
			decision,
		}
	} catch (error) {
		console.error("❌ Failed to fetch workflow output:", error)
		throw error
	}
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
		base64Image = parts[1] ?? base64Image
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
			occlusion: details?.qualityChecks?.faceOccluded ?? details?.qualityChecks?.occlusion,
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
