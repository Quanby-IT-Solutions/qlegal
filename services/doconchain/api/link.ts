import { z } from "zod/v4"

import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { getToken } from "../lib/token-cache"

const signLinkResponseSchema = z.union([
	z.object({
		data: z.object({
			link: z.string(),
		}),
	}),
	z.object({
		message: z.string(),
	}),
	z.object({
		link: z.string(),
	}),
	z.object({
		url: z.string(),
	}),
])

const editDraftLinkResponseSchema = z.union([
	z.object({
		message: z.string(),
	}),
	z.object({
		message: z.object({
			message: z.string().optional(),
			link: z.string().optional(),
		}),
	}),
	z.object({
		data: z.object({
			link: z.string().optional(),
			url: z.string().optional(),
			message: z.string().optional(),
		}),
	}),
	z.object({
		link: z.string(),
	}),
	z.object({
		url: z.string(),
	}),
])

interface GenerateSignLinkParams {
	projectUuid: string
	email: string
	userEmail?: string
}

export async function generateSignLink({
	projectUuid,
	email,
	userEmail,
}: GenerateSignLinkParams): Promise<{ link: string }> {
	const apiUrl = `${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link/generate?email=${encodeURIComponent(email)}&user_type=ENTERPRISE_API`

	const response = await apiCall(async token => {
		return fetch(apiUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		})
	}, userEmail ?? email)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const json: unknown = await response.json()
	const result = signLinkResponseSchema.safeParse(json)

	if (!result.success) {
		console.error("doconchain generate sign link response:", JSON.stringify(json, null, 2))
		throw new Error(`doconchain returned invalid response: ${JSON.stringify(json)}`)
	}

	// Extract link from various possible response formats
	let link: string | undefined
	const responseData = result.data
	
	if ("data" in responseData) {
		const dataObj = responseData.data
		if (dataObj && typeof dataObj === "object" && "link" in dataObj) {
			link = dataObj.link
		}
	} else if ("message" in responseData && typeof responseData.message === "string") {
		link = responseData.message
	} else if ("link" in responseData) {
		link = responseData.link
	} else if ("url" in responseData) {
		link = responseData.url
	}

	if (!link) {
		console.error("doconchain generate sign link response:", JSON.stringify(json, null, 2))
		throw new Error("doconchain response missing link")
	}

	const normalizedLink = normalizeLink(link)
	
	// For Generate Sign Link, we MUST use the creator's token (userEmail) not the signer's token
	// The creator owns the project and has permission to generate signing links
	const tokenEmail = userEmail ?? env.DOCONCHAIN_EMAIL
	console.log("🔵 Adding api_token to Generate Sign Link using email:", tokenEmail)
	
	const finalLink = await appendApiToken(normalizedLink, tokenEmail, true)
	console.log("✅ Generate Sign Link with api_token:", finalLink.substring(0, 100) + "...")
	return { link: finalLink }
}

export async function generateEditDraftLink(
	projectUuid: string,
	userEmail?: string
): Promise<{ link: string }> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const json: unknown = await response.json()
	const result = editDraftLinkResponseSchema.safeParse(json)

	if (!result.success) {
		console.error("doconchain edit draft link response:", JSON.stringify(json, null, 2))
		throw new Error(`doconchain returned invalid response: ${JSON.stringify(json)}`)
	}

	// Extract link from various possible response formats
	let link: string | undefined
	const responseData = result.data
	
	if ("message" in responseData) {
		const messageData = responseData.message
		if (typeof messageData === "string") {
			link = messageData
		} else if (messageData && typeof messageData === "object" && "link" in messageData) {
			link = messageData.link ?? messageData.message
		}
	}
	
	if (!link && "data" in responseData) {
		const dataObj = responseData.data
		link = dataObj.link ?? dataObj.url ?? dataObj.message
	}
	
	if (!link && "link" in responseData) {
		link = responseData.link
	}
	
	if (!link && "url" in responseData) {
		link = responseData.url
	}

	if (!link) {
		console.error("doconchain edit draft link response:", JSON.stringify(json, null, 2))
		throw new Error("doconchain response missing link")
	}

	// Normalize the link (removes status=Deleted and adds api=true)
	const normalizedLink = normalizeLink(link)
	
	// Add api_token if not present (pass true to indicate already normalized)
	const finalLink = await appendApiToken(normalizedLink, userEmail ?? env.DOCONCHAIN_EMAIL, true)
	
	return { link: finalLink }
}

export function getSigningUrl(projectUuid: string): string {
	return `${env.DOCONCHAIN_APP_URL}/${projectUuid}`
}

function normalizeLink(link: string): string {
	if (!link.startsWith("http")) {
		link = link.startsWith("/")
			? `${env.DOCONCHAIN_APP_URL}${link}`
			: `${env.DOCONCHAIN_APP_URL}/${link}`
	}

	try {
		const url = new URL(link)
		url.searchParams.set("api", "true")
		url.searchParams.delete("api_token")
		// Remove status=Deleted parameter if present (known DocoChain bug)
		if (url.searchParams.get("status") === "Deleted") {
			console.warn("⚠️ Removing incorrect status=Deleted parameter from URL (known DocoChain bug)")
			url.searchParams.delete("status")
		}
		return url.toString()
	} catch (error) {
		console.error("Failed to normalize link:", link, error)
		// If URL parsing fails, try to manually remove status=Deleted
		if (link.includes("status=Deleted")) {
			link = link.replace(/[?&]status=Deleted/g, "")
		}
		return link
	}
}

async function appendApiToken(link: string, email: string, alreadyNormalized = false): Promise<string> {
	// Only normalize if not already normalized
	const normalizedLink = alreadyNormalized ? link : normalizeLink(link)
	
	try {
		const url = new URL(normalizedLink)

		// Remove api_token if it's undefined or empty
		if (url.searchParams.has("api_token")) {
			const existingToken = url.searchParams.get("api_token")
			if (!existingToken || existingToken === "undefined" || existingToken === "") {
				url.searchParams.delete("api_token")
				console.log("⚠️ Removed invalid/empty api_token from URL")
			}
		}

		// ALWAYS add api_token for API access - required for document loading
		// Get a fresh, verified token to ensure it's not expired
		const apiToken = await getToken(email)
		url.searchParams.set("api_token", apiToken)
		
		console.log("✅ Added api_token to signing link (length:", apiToken.length, "chars)")

		return url.toString()
	} catch (error) {
		console.error("❌ Failed to append API token to link:", normalizedLink, error)
		// Fallback: try to append token manually
		const separator = normalizedLink.includes("?") ? "&" : "?"
		const apiToken = await getToken(email)
		const fallbackLink = `${normalizedLink}${separator}api_token=${encodeURIComponent(apiToken)}`
		console.log("✅ Added api_token via fallback method")
		return fallbackLink
	}
}
