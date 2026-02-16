import { z } from "zod/v4"

import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { getOrRefreshProjectToken, getProjectToken, getToken } from "../lib/token-cache"

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

	// CRITICAL: Use the SAME token that was generated during project creation
	// Don't force regeneration - use the cached token to ensure consistency
	// The token was already generated fresh during project creation, so it has maximum validity
	// Only regenerate if we get 401 (handled by apiCall)
	console.log("🔵 Generating Sign Link - using cached token from project creation...")
	const response = await apiCall(
		async token => {
			return fetch(apiUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			})
		},
		userEmail ?? email,
		false
	) // Use cached token from project creation, don't force regeneration

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
	console.log("✅ Generate Sign Link with api_token ready")
	return { link: finalLink }
}

/** Extract short code (first path segment only) from API link. Avoids including paths like "email-document-status" or query params like status=Deleted. */
function extractPlotShortCode(link: string): string {
	const trimmed = link.trim()
	if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed
	try {
		const url = new URL(trimmed.startsWith("http") ? trimmed : `https://x${trimmed}`)
		const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "")
		const firstSegment = path.split("/")[0]
		if (firstSegment) return firstSegment
		const segment = trimmed.replace(/^\/+/, "").split("?")[0]
		const first = (segment ?? trimmed).split("/")[0]
		return first ?? trimmed
	} catch {
		const path = trimmed.replace(/^\/+/, "").split("?")[0]
		const first = (path ?? trimmed).split("/")[0]
		return first ?? trimmed
	}
}

/**
 * Generate Edit Draft Project Link (Plot Signature).
 * API: POST {DOCONCHAIN_API_URL}/api/v2/projects/:uuid/link?user_type=ENTERPRISE_API
 * Response: { message: { message: "...", link: "https://link.doconchain.com/<shortCode>" } }
 * We use the short code and build plot URL with page, user_type, email, signer_role, api=true + api_token.
 */
export async function generateEditDraftLink(
	projectUuid: string,
	userEmail?: string,
	tokenOverride?: string,
	forPlotting?: boolean
): Promise<{ link: string }> {
	// CRITICAL: Use the SAME token that was used to CREATE this project (or meeting token when plotting).
	// tokenOverride = meeting-scoped token from ENP join; use it for Edit Draft when plotting.
	console.log("🔵 Generating Edit Draft Project Link...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail ?? env.DOCONCHAIN_EMAIL)
	console.log("   - Token override (meeting):", tokenOverride ? "yes" : "no")
	console.log("   - For plotting (app URL + page/email/signer_role):", forPlotting ?? false)

	let token: string
	let response: Response

	if (tokenOverride) {
		console.log("   - Using meeting-scoped token override (ENP join)...")
		token = tokenOverride
		response = await fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	} else {
		const projectToken = await getOrRefreshProjectToken(
			projectUuid,
			userEmail ?? env.DOCONCHAIN_EMAIL
		)
		if (projectToken) {
			console.log(
				"   - Using project-specific token (stored during project creation, refreshed if stale)..."
			)
			token = projectToken
			response = await fetch(
				`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				}
			)
			if (response.status === 401) {
				console.warn(
					"⚠️ Project-specific token returned 401 - falling back to email-based token cache..."
				)
				response = await apiCall(
					async t => {
						return fetch(
							`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
							{
								method: "POST",
								headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
							}
						)
					},
					userEmail,
					false
				)
				token = "" // apiCall uses its own token; appendApiToken will use project/email
			}
		} else {
			console.log("   - No project-specific token found - using email-based token cache...")
			response = await apiCall(
				async t => {
					return fetch(
						`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
						{
							method: "POST",
							headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
						}
					)
				},
				userEmail,
				false
			)
			token = ""
		}
	}

	if (!response.ok) {
		const errorText = await response.text()
		const errorMessage = `doconchain API error: ${response.status} ${response.statusText} - ${errorText}`

		// If it's a 401 error, apiCall should have already retried with a fresh token
		// But if we still get 401, throw a more specific error for upstream retry logic
		if (response.status === 401) {
			console.error("❌ Still getting 401 after token regeneration in generateEditDraftLink")
			throw new Error(`Token expired or unauthorized: ${errorMessage}`)
		}

		throw new Error(errorMessage)
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

	const email = userEmail ?? env.DOCONCHAIN_EMAIL

	if (forPlotting) {
		// Plotting: requires an enterprise `api_token` for access.
		// We build a plotting URL from the short-code and append a *fresh* api_token (meeting/project scoped).
		// NOTE: Even if we start from link.doconchain.com, DocoChain may redirect to stg-app/app on their side.
		const shortCode = extractPlotShortCode(link)
		const plotUrl = new URL(`https://link.doconchain.com/${shortCode}`)
		plotUrl.searchParams.set("page", "1")
		plotUrl.searchParams.set("user_type", "ENTERPRISE_API")
		plotUrl.searchParams.set("email", email)
		plotUrl.searchParams.set("signer_role", "Signer")
		plotUrl.searchParams.set("api", "true")
		plotUrl.searchParams.delete("status") // known DocoChain bug

		const plotLinkStr = plotUrl.toString()
		const finalLink = await appendApiToken(
			plotLinkStr,
			email,
			true,
			tokenOverride ? undefined : projectUuid,
			tokenOverride
		)
		console.log("🔵 Built plot link (link.doconchain.com + params + api_token)")
		return { link: finalLink }
	}

	// Normalize the link (removes status=Deleted and adds api=true) for non-plotting edit-draft
	const normalizedLink = normalizeLink(link)

	// Add api_token if not present. Use tokenOverride (meeting token) when provided.
	const finalLink = await appendApiToken(
		normalizedLink,
		email,
		true,
		tokenOverride ? undefined : projectUuid,
		tokenOverride
	)

	return { link: finalLink }
}

export function getSigningUrl(projectUuid: string): string {
	return `${env.DOCONCHAIN_APP_URL}/${projectUuid}`
}

function normalizeLink(link: string): string {
	// CRITICAL: Preserve link.doconchain.com domain for Edit Draft Links
	// Edit Draft Links use link.doconchain.com, not stg-app.doconchain.com
	// Only use DOCONCHAIN_APP_URL if the link doesn't already have a domain

	// Edit Draft Links must always use link.doconchain.com, never stg-app/app.doconchain.com
	const editDraftDomain = "https://link.doconchain.com"

	if (!link.startsWith("http")) {
		// Check if it's a short-code link (like "tJXEOq26") or path - all use link.doconchain.com
		const isShortCode = /^[a-zA-Z0-9]+$/.test(link.trim())

		if (isShortCode) {
			link = `${editDraftDomain}/${link}`
			console.log("🔵 Detected short-code link, using link.doconchain.com domain")
		} else if (link.startsWith("/")) {
			// Absolute path - use link.doconchain.com (never DOCONCHAIN_APP_URL / stg-app)
			link = `${editDraftDomain}${link}`
			console.log("🔵 Using link.doconchain.com for path-only Edit Draft Link")
		} else {
			// Relative path
			link = `${editDraftDomain}/${link}`
			console.log("🔵 Using link.doconchain.com for relative Edit Draft Link")
		}
	} else {
		// Link already has http/https - check if it's link.doconchain.com and preserve it
		try {
			const url = new URL(link)
			if (url.hostname === "link.doconchain.com" || url.hostname.includes("link.doconchain.com")) {
				console.log("🔵 Preserving link.doconchain.com domain")
				// Keep the link.doconchain.com domain as-is
			}
		} catch {
			// URL parsing failed, continue with normalization
		}
	}

	try {
		const url = new URL(link)

		// CRITICAL: Always convert stg-app/app.doconchain.com to link.doconchain.com (never expose staging URL)
		if (
			url.hostname.includes("stg-app.doconchain.com") ||
			url.hostname.includes("app.doconchain.com")
		) {
			console.log("🔵 Converting stg-app/app.doconchain.com to link.doconchain.com")
			url.hostname = "link.doconchain.com"
		}

		// CRITICAL: For link.doconchain.com, clean up unwanted parameters
		// Edit Draft Links should ONLY have: api=true and api_token
		// Remove parameters that are for Sign Links, not Edit Draft Links
		if (url.hostname.includes("link.doconchain.com")) {
			console.log(
				"🔵 Cleaning Edit Draft Link - removing unwanted parameters (token, email, signer_role, page)..."
			)
			url.searchParams.delete("token") // Remove token parameter (not needed for Edit Draft Links)
			url.searchParams.delete("email") // Remove email parameter (not needed for Edit Draft Links)
			url.searchParams.delete("signer_role") // Remove signer_role parameter (not needed for Edit Draft Links)
			url.searchParams.delete("page") // Remove page parameter (not needed for Edit Draft Links)
		}

		url.searchParams.set("api", "true")
		url.searchParams.delete("api_token") // Will be re-added by appendApiToken with fresh token

		// Remove status=Deleted parameter if present (known DocoChain bug)
		if (url.searchParams.get("status") === "Deleted") {
			console.warn("⚠️ Removing incorrect status=Deleted parameter from URL (known DocoChain bug)")
			url.searchParams.delete("status")
		}

		return url.toString()
	} catch (error) {
		console.error("Failed to normalize link:", link, error)
		// If URL parsing fails, try to manually clean up
		if (link.includes("status=Deleted")) {
			link = link.replace(/[?&]status=Deleted/g, "")
		}
		// Remove unwanted parameters manually if URL parsing failed
		link = link.replace(/[?&]token=[^&]*/g, "")
		link = link.replace(/[?&]email=[^&]*/g, "")
		link = link.replace(/[?&]signer_role=[^&]*/g, "")
		link = link.replace(/[?&]page=[^&]*/g, "")
		// Try to convert stg-app to link.doconchain.com if it's a short-code path
		link = link.replace(
			/https?:\/\/(stg-)?app\.doconchain\.com\/([a-zA-Z0-9]+)/g,
			"https://link.doconchain.com/$2"
		)
		return link
	}
}

async function appendApiToken(
	link: string,
	email: string,
	alreadyNormalized = false,
	projectUuid?: string,
	tokenOverride?: string
): Promise<string> {
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

		let apiToken: string
		if (tokenOverride) {
			console.log("🔵 Using meeting-scoped token override for URL...")
			apiToken = tokenOverride
		} else if (projectUuid) {
			const projectToken = await getOrRefreshProjectToken(projectUuid, email)
			if (projectToken) {
				console.log(
					"🔵 Using project-specific token for URL (refreshed if stale, same token used for project creation)..."
				)
				apiToken = projectToken
			} else {
				console.log(
					"🔵 No project-specific token found - using email-based cached token (fallback)..."
				)
				apiToken = await getToken(email, false)
			}
		} else {
			console.log("🔵 Using email-based cached token for URL...")
			apiToken = await getToken(email, false)
		}

		url.searchParams.set("api_token", apiToken)

		console.log(
			"✅ Added api_token to signing link (length:",
			apiToken.length,
			"chars, using",
			tokenOverride
				? "meeting override"
				: projectUuid && getProjectToken(projectUuid)
					? "project-specific"
					: "email-based",
			"token)"
		)

		return url.toString()
	} catch (error) {
		console.error("❌ Failed to append API token to link:", error)
		const separator = normalizedLink.includes("?") ? "&" : "?"
		let apiToken: string
		if (tokenOverride) {
			apiToken = tokenOverride
		} else if (projectUuid) {
			const projectToken = await getOrRefreshProjectToken(projectUuid, email)
			apiToken = projectToken ?? (await getToken(email, false))
		} else {
			apiToken = await getToken(email, false)
		}
		const fallbackLink = `${normalizedLink}${separator}api_token=${encodeURIComponent(apiToken)}`
		console.log("✅ Added api_token via fallback method")
		return fallbackLink
	}
}
