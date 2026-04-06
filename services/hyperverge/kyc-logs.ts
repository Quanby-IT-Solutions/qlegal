import { env } from "@/env"

const DEFAULT_BASE_URL = "https://ind.idv.hyperverge.co"
const CONFIGURED_BASE_URL = (env.HYPERVERGE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "")
const FALLBACK_BASE_URL = DEFAULT_BASE_URL

const LOGS_URL_PRIMARY = `${CONFIGURED_BASE_URL}/v1/link-kyc/results`
const LOGS_URL_FALLBACK = `${FALLBACK_BASE_URL}/v1/link-kyc/results`

const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""

function validateCredentials(): void {
	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}
}

type YesNo = "yes" | "no"

export type HyperVergeApplicationStatus =
	| "auto_approved"
	| "auto_declined"
	| "needs_review"
	| "user_cancelled"
	| "error"
	| "pending"
	| "started"

export interface HyperVergeLogsApiResponse {
	status: "success" | "failure"
	statusCode: number
	metadata?: { requestId?: string; transactionId?: string }
	result?: {
		workflowDetails?: Record<string, unknown>
		applicationStatus?: string
		userDetails?: Record<string, unknown>
		results?: unknown[]
		[key: string]: unknown
	}
}

export async function getHyperVergeKycLogs(config: {
	transactionId: string
	sendUserDetails?: YesNo
	generateNewLinks?: YesNo
	bucketPathFlag?: YesNo
	sendFlag?: YesNo
	includePreviousAttempts?: YesNo
}): Promise<HyperVergeLogsApiResponse> {
	validateCredentials()

	const body: Record<string, unknown> = {
		transactionId: config.transactionId,
		sendUserDetails: config.sendUserDetails ?? "yes",
		generateNewLinks: config.generateNewLinks ?? "yes",
		bucketPathFlag: config.bucketPathFlag ?? "yes",
		sendFlag: config.sendFlag ?? "no",
		includePreviousAttempts: config.includePreviousAttempts ?? "yes",
	}

	let response: Response
	try {
		response = await fetch(LOGS_URL_PRIMARY, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"appId": HYPERVERGE_APP_ID,
				"appKey": HYPERVERGE_APP_KEY,
			},
			body: JSON.stringify(body),
		})
	} catch (networkErr) {
		console.warn("⚠️ Primary Logs API failed (network)", networkErr)
		response = await fetch(LOGS_URL_FALLBACK, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"appId": HYPERVERGE_APP_ID,
				"appKey": HYPERVERGE_APP_KEY,
			},
			body: JSON.stringify(body),
		})
	}

	const responseText = await response.text()
	if (!response.ok) {
		throw new Error(`HyperVerge Logs API error: ${response.status} - ${responseText}`)
	}

	return JSON.parse(responseText) as HyperVergeLogsApiResponse
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v)

const looksLikeUrl = (v: unknown): v is string =>
	typeof v === "string" && /^https?:\/\/\S+$/i.test(v)

export function pickBestFaceImageUrlFromLogs(logs: HyperVergeLogsApiResponse): string | null {
	const root = logs.result ?? {}

	const scoreKey = (k: string): number => {
		const key = k.toLowerCase()
		// Prefer face-y artifacts
		if (key.includes("cropped")) return 120
		if (key.includes("face")) return 100
		if (key.includes("selfie")) return 90
		if (key.includes("portrait")) return 80
		// Avoid grabbing onboarding link URLs
		if (key.includes("startkyc") || key.includes("start") || key.includes("link")) return -50
		if (key.includes("id")) return 40
		if (key.includes("image")) return 30
		if (key.includes("photo")) return 20
		if (key.includes("url")) return 10
		return 0
	}

	const candidates: Array<{ url: string; score: number }> = []
	const maxDepth = 7
	const maxNodes = 700
	let visited = 0

	const walk = (node: unknown, depth: number, parentKey: string | null) => {
		if (visited++ > maxNodes) return
		if (depth > maxDepth) return

		if (looksLikeUrl(node) && parentKey) {
			const score = scoreKey(parentKey)
			if (score > 0) candidates.push({ url: node, score })
			return
		}

		if (Array.isArray(node)) {
			for (const item of node) walk(item, depth + 1, parentKey)
			return
		}

		if (isRecord(node)) {
			for (const [k, v] of Object.entries(node)) walk(v, depth + 1, k)
		}
	}

	walk(root, 0, null)
	candidates.sort((a, b) => b.score - a.score)
	return candidates[0]?.url ?? null
}

export function pickOcrFieldsFromLogs(
	logs: HyperVergeLogsApiResponse
): Record<string, unknown> | null {
	const results = logs.result?.results
	if (!Array.isArray(results)) return null

	const keyMatches = (value: unknown, needle: string) =>
		typeof value === "string" && value.toLowerCase().includes(needle)

	const findDeep = (node: unknown): Record<string, unknown> | null => {
		const maxDepth = 8
		const maxNodes = 1200
		let visited = 0

		const walk = (n: unknown, depth: number): Record<string, unknown> | null => {
			if (visited++ > maxNodes) return null
			if (depth > maxDepth) return null

			if (isRecord(n)) {
				for (const [k, v] of Object.entries(n)) {
					const key = k.toLowerCase()
					if (
						key === "fieldsextracted" ||
						key === "fields_extracted" ||
						key === "extractedfields" ||
						key === "ocrfields" ||
						key === "extracted"
					) {
						if (isRecord(v)) return v
					}

					const found = walk(v, depth + 1)
					if (found) return found
				}
			} else if (Array.isArray(n)) {
				for (const item of n) {
					const found = walk(item, depth + 1)
					if (found) return found
				}
			}
			return null
		}

		return walk(node, 0)
	}

	// Prefer likely ID/OCR modules first.
	for (const entry of results) {
		if (!isRecord(entry)) continue
		const moduleName = entry.module
		const moduleId = entry.moduleId

		const looksLikeIdValidation =
			keyMatches(moduleName, "id") ||
			keyMatches(moduleName, "ocr") ||
			keyMatches(moduleName, "id card") ||
			keyMatches(moduleId, "id") ||
			keyMatches(moduleId, "ocr")

		if (!looksLikeIdValidation) continue

		const fields = findDeep(entry)
		if (fields) return fields
	}

	// Fallback: search entire results array.
	return findDeep(results)
}

export async function fetchImageUrlAsDataUrl(url: string): Promise<string | null> {
	try {
		const imgRes = await fetch(url)
		if (!imgRes.ok) return null

		const contentType = imgRes.headers.get("content-type") ?? "image/jpeg"
		const arrayBuffer = await imgRes.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString("base64")
		return `data:${contentType};base64,${base64}`
	} catch {
		return null
	}
}
