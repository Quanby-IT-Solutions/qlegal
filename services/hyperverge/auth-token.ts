/**
 * HyperVerge Authentication Token API
 *
 * Generates JWT access tokens for the Web SDK.
 * API: POST {base}/v2/auth/token
 * Docs: https://documentation.hyperverge.co/other-resources/authentication
 */

import { env } from "@/env"

const DEFAULT_BASE_URL = "https://ind.idv.hyperverge.co"
const FALLBACK_BASE_URL = "https://ind-state.idv.hyperverge.co"
const CONFIGURED_BASE_URL = (env.HYPERVERGE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "")

// Auth token API lives on idv host; avoid using api.hyperverge.com which does not host /v2/auth/token
const AUTH_BASE_PRIMARY =
	CONFIGURED_BASE_URL.includes("idv.hyperverge") ? CONFIGURED_BASE_URL : DEFAULT_BASE_URL

const HYPERVERGE_APP_ID = env.HYPERVERGE_APP_ID || ""
const HYPERVERGE_APP_KEY = env.HYPERVERGE_APP_KEY || ""
const HYPERVERGE_WORKFLOW_ID = env.HYPERVERGE_WORKFLOW_ID || ""

const AUTH_URL_PRIMARY = `${AUTH_BASE_PRIMARY}/v2/auth/token`
const AUTH_URL_FALLBACK = `${FALLBACK_BASE_URL}/v2/auth/token`

export interface GetAuthTokenParams {
	transactionId: string
	workflowId?: string
	expiry?: number
}

export interface AuthTokenResponse {
	status: string
	statusCode: number
	result: {
		authToken: string
	}
}

/**
 * Get an auth token for the HyperVerge Web SDK.
 * Uses the same transactionId and workflowId that will be passed to the SDK.
 */
export async function getHyperVergeAuthToken(
	params: GetAuthTokenParams
): Promise<string> {
	if (!HYPERVERGE_APP_ID || !HYPERVERGE_APP_KEY) {
		throw new Error(
			"HyperVerge credentials not configured. Set HYPERVERGE_APP_ID and HYPERVERGE_APP_KEY in .env"
		)
	}

	const workflowId = params.workflowId ?? HYPERVERGE_WORKFLOW_ID
	if (!workflowId) {
		throw new Error(
			"HyperVerge workflow ID not configured. Set HYPERVERGE_WORKFLOW_ID in .env or pass workflowId"
		)
	}

	const body = {
		appId: HYPERVERGE_APP_ID,
		appKey: HYPERVERGE_APP_KEY,
		expiry: params.expiry ?? 3600,
		transactionId: params.transactionId,
		workflowId,
		authenticateOnResume: "no",
	}

	let response: Response
	try {
		response = await fetch(AUTH_URL_PRIMARY, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})
	} catch (networkErr) {
		console.warn("⚠️ Primary auth token fetch failed (network)", networkErr)
		response = await fetch(AUTH_URL_FALLBACK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})
	}

	if (!response.ok && (response.status === 404 || response.status === 502)) {
		response = await fetch(AUTH_URL_FALLBACK, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})
	}

	const responseText = await response.text()
	if (!response.ok) {
		throw new Error(`HyperVerge auth token error: ${response.status} - ${responseText}`)
	}

	const result = JSON.parse(responseText) as AuthTokenResponse
	if (result.status !== "success" || !result.result?.authToken) {
		throw new Error(`HyperVerge auth token error: ${responseText}`)
	}

	return result.result.authToken
}
