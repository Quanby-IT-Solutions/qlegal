import { env } from "@/env"

const DEFAULT_BASE_URL = "https://ind.idv.hyperverge.co"
const CONFIGURED_BASE_URL = (env.HYPERVERGE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "")
const FALLBACK_BASE_URL = DEFAULT_BASE_URL

const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""

function validateCredentials(): void {
	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}
}

function stripDataUrlPrefix(base64OrDataUrl: string): string {
	if (base64OrDataUrl.startsWith("data:")) {
		const parts = base64OrDataUrl.split(",")
		return parts[1] ?? base64OrDataUrl
	}
	return base64OrDataUrl
}

function base64ToBlob(base64OrDataUrl: string, mimeType = "image/jpeg"): Blob {
	const base64 = stripDataUrlPrefix(base64OrDataUrl)
	const byteCharacters = atob(base64)
	const byteNumbers = new Array(byteCharacters.length)
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i)
	}
	const byteArray = new Uint8Array(byteNumbers)
	return new Blob([byteArray], { type: mimeType })
}

const GENERIC_ERROR = "Verification failed. Please try again."

/**
 * Parses HyperVerge API error response and returns a user-facing message.
 * Logs raw response for support; never exposes raw JSON or codes to the client.
 */
function parseHyperVergeErrorForUser(responseText: string): string {
	try {
		const raw = JSON.parse(responseText) as {
			result?: {
				error?: string
				summary?: { details?: Array<{ code?: string; message?: string }> }
			}
		}
		const result = raw?.result
		if (!result) return GENERIC_ERROR

		const errorStr = (result.error ?? "").trim().toLowerCase()
		const details = result.summary?.details
		const firstCode = details?.[0]?.code?.trim()
		const firstMessage = details?.[0]?.message?.trim()

		// Known readId / document errors
		if (
			errorStr.includes("document not detected") ||
			firstCode === "114"
		) {
			return "We couldn't detect a valid ID document in the photo. Please ensure the full document is visible, well lit, and not blurry, then try again."
		}
		// Code 113: document type/country not supported (e.g. when fallback India API is used and only supports a subset)
		if (errorStr.includes("document not supported") || firstCode === "113") {
			return "This document type isn't supported by the current verification service. Try using a Passport if you have one, or try again later. If the issue continues, the main verification server may be temporarily unavailable."
		}
		if (errorStr.includes("blur") || firstMessage?.toLowerCase().includes("blur")) {
			return "The photo is too blurry. Please hold the document steady and ensure it's in focus, then try again."
		}
		if (errorStr.includes("face") && (errorStr.includes("match") || errorStr.includes("detect"))) {
			return "We couldn't verify your face. Please ensure your face is clearly visible and matches the ID photo, then try again."
		}

		// Use first detail message only if it looks user-safe (short, no technical IDs)
		if (firstMessage && firstMessage.length < 120 && !/[\w-]{8,}-[\w-]{4,}-[\w-]{4,}-[\w-]{4,}-[\w-]{12,}/.test(firstMessage)) {
			return firstMessage
		}

		return GENERIC_ERROR
	} catch {
		return GENERIC_ERROR
	}
}

export type HyperVergeSummaryAction = "pass" | "fail" | "manualReview"

export interface HyperVergeApiSummary {
	action: HyperVergeSummaryAction
	details?: Array<{ code?: string; message?: string }>
}

export interface HyperVergeReadIdResponse {
	status: "success" | "failure"
	statusCode: string | number
	result?: {
		details?: unknown[]
		summary?: HyperVergeApiSummary
		error?: string
	}
	metaData?: {
		requestId?: string
		transactionId?: string
	}
	metadata?: {
		requestId?: string
		transactionId?: string
	}
	error?: string
}

/**
 * ID Card Validation API (readId)
 *
 * Docs: POST /v1/readId with multipart/form-data
 * - headers: appId, appKey, transactionId
 * - form: image, countryId (3-letter), documentId, expectedDocumentSide (optional)
 */
export async function readIdCard(config: {
	transactionId: string
	imageBase64: string
	countryId: string
	documentId: string
	expectedDocumentSide?: "front" | "back"
}): Promise<{
	raw: HyperVergeReadIdResponse
	summaryAction: HyperVergeSummaryAction | "unknown"
}> {
	validateCredentials()

	const urlPrimary = `${CONFIGURED_BASE_URL}/v1/readId`
	const urlFallback = `${FALLBACK_BASE_URL}/v1/readId`

	const imageBlob = base64ToBlob(config.imageBase64, "image/jpeg")
	const formData = new FormData()
	formData.append("image", imageBlob, "id.jpg")
	formData.append("countryId", config.countryId)
	formData.append("documentId", config.documentId)
	if (config.expectedDocumentSide)
		formData.append("expectedDocumentSide", config.expectedDocumentSide)

	let response: Response
	try {
		response = await fetch(urlPrimary, {
			method: "POST",
			headers: {
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
				transactionId: config.transactionId,
			},
			body: formData,
		})
	} catch (networkErr) {
		console.warn("⚠️ Primary readId failed (network)", networkErr)
		// Fallback is India endpoint (ind.idv.hyperverge.co); it may return 423 "Document Not Supported"
		// for country/document combinations it doesn't support (e.g. non-India IDs).
		response = await fetch(urlFallback, {
			method: "POST",
			headers: {
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
				transactionId: config.transactionId,
			},
			body: formData,
		})
	}

	const responseText = await response.text()
	if (!response.ok) {
		console.warn("HyperVerge readId API error (raw for support):", response.status, responseText)
		throw new Error(parseHyperVergeErrorForUser(responseText))
	}

	const parsed = JSON.parse(responseText) as HyperVergeReadIdResponse
	const summaryAction = parsed.result?.summary?.action ?? "unknown"
	return { raw: parsed, summaryAction }
}

export interface HyperVergeMatchFaceResponse {
	status: "success" | "failure"
	statusCode: string | number
	result?: {
		details?: {
			match?: { value?: "yes" | "no"; confidence?: "high" | "low"; score?: number }
		}
		summary?: HyperVergeApiSummary
		error?: string
	}
	metaData?: { requestId?: string; transactionId?: string }
	metadata?: { requestId?: string; transactionId?: string }
	error?: string
}

/**
 * Face Match API (matchFace) - selfie vs ID image.
 *
 * Docs: POST /v1/matchFace with multipart/form-data
 * - headers: appId, appKey, transactionId
 * - form: selfie (file), id (file)  (we use this variation)
 */
export async function matchFaceSelfieToId(config: {
	transactionId: string
	selfieBase64: string
	idBase64: string
	returnScore?: boolean
}): Promise<{
	raw: HyperVergeMatchFaceResponse
	matchValue: "yes" | "no" | "unknown"
	summaryAction: HyperVergeSummaryAction | "unknown"
}> {
	validateCredentials()

	const urlPrimary = `${CONFIGURED_BASE_URL}/v1/matchFace`
	const urlFallback = `${FALLBACK_BASE_URL}/v1/matchFace`

	const selfieBlob = base64ToBlob(config.selfieBase64, "image/jpeg")
	const idBlob = base64ToBlob(config.idBase64, "image/jpeg")

	const formData = new FormData()
	formData.append("selfie", selfieBlob, "selfie.jpg")
	formData.append("id", idBlob, "id.jpg")
	if (config.returnScore) formData.append("preferences.returnScore", "yes")

	let response: Response
	try {
		response = await fetch(urlPrimary, {
			method: "POST",
			headers: {
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
				transactionId: config.transactionId,
			},
			body: formData,
		})
	} catch (networkErr) {
		console.warn("⚠️ Primary matchFace failed (network)", networkErr)
		response = await fetch(urlFallback, {
			method: "POST",
			headers: {
				appId: HYPERVERGE_APP_ID,
				appKey: HYPERVERGE_APP_KEY,
				transactionId: config.transactionId,
			},
			body: formData,
		})
	}

	const responseText = await response.text()
	if (!response.ok) {
		console.warn("HyperVerge matchFace API error (raw for support):", response.status, responseText)
		throw new Error(parseHyperVergeErrorForUser(responseText))
	}

	const parsed = JSON.parse(responseText) as HyperVergeMatchFaceResponse
	const matchValue = parsed.result?.details?.match?.value ?? "unknown"
	const summaryAction = parsed.result?.summary?.action ?? "unknown"

	return { raw: parsed, matchValue, summaryAction }
}
