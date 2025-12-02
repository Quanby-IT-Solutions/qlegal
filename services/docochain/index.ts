/**
 * DocoChain API Integration Service
 * API Base URL: https://stg-api2.doconchain.com
 */

import { env } from "@/env"

const DOCOCHAIN_API_BASE = env.DOCOCHAIN_API_URL || "https://stg-api2.doconchain.com"
const DOCOCHAIN_API_TOKEN = env.DOCOCHAIN_API_TOKEN || ""
const DOCOCHAIN_ORGANIZATION_ID = env.DOCOCHAIN_ORGANIZATION_ID || ""
const DOCOCHAIN_CLIENT_KEY = env.DOCOCHAIN_CLIENT_KEY || ""
const DOCOCHAIN_CLIENT_SECRET = env.DOCOCHAIN_CLIENT_SECRET || ""

// Token cache to store generated tokens per email
// Format: { email: { token: string, expiresAt: number } }
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

// Token expiration time: 1 hour (3600000 ms) - tokens typically expire after some time
const TOKEN_EXPIRATION_MS = 3600000 // 1 hour

// Refresh tokens 5 minutes before expiration to avoid expired token errors
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a DocoChain authentication token for a specific user email
 * Uses the Generate Token API: POST https://stg-api2.doconchain.com/api/v2/generate/token
 * 
 * @param email - The email address of the user to generate token for
 * @returns The generated token string
 */
export async function generateDocoChainToken(email: string, forceRefresh = false): Promise<string> {
	console.log("🔵 Generating DocoChain token...")
	console.log("   - Email:", email)
	console.log("   - Force refresh:", forceRefresh)
	
	// Check cache first (unless forcing refresh)
	if (!forceRefresh) {
		const cached = tokenCache.get(email)
		if (cached) {
			const now = Date.now()
			// If token is still valid and not about to expire, use cached token
			if (cached.expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
				console.log("✅ Using cached token for:", email)
				console.log("   - Token expires in:", Math.round((cached.expiresAt - now) / 1000 / 60), "minutes")
				return cached.token
			}
			// Token is about to expire, refresh it proactively
			if (cached.expiresAt > now) {
				console.log("🔄 Token expiring soon, refreshing proactively for:", email)
				console.log("   - Token expires in:", Math.round((cached.expiresAt - now) / 1000 / 60), "minutes")
			} else {
				console.log("⚠️ Cached token expired, generating new token for:", email)
			}
		}
	} else {
		console.log("🔄 Force refreshing token for:", email)
		// Clear the cache entry to force a new token generation
		tokenCache.delete(email)
	}

	try {
		if (!DOCOCHAIN_CLIENT_KEY || !DOCOCHAIN_CLIENT_SECRET) {
			console.warn("⚠️ DocoChain client credentials not configured. Using static token.")
			// Fallback to static token if credentials not available
			if (DOCOCHAIN_API_TOKEN) {
				return DOCOCHAIN_API_TOKEN
			}
			throw new Error("DocoChain client credentials not configured. Set DOCOCHAIN_CLIENT_KEY and DOCOCHAIN_CLIENT_SECRET in .env.local")
		}

		const formData = new FormData()
		formData.append("client_key", DOCOCHAIN_CLIENT_KEY)
		formData.append("client_secret", DOCOCHAIN_CLIENT_SECRET)
		formData.append("email", email)

		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/generate/token`
		console.log("🔵 Calling DocoChain Generate Token API:", apiUrl)

		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
			},
			body: formData,
		})

		console.log("📡 DocoChain generate token response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain generate token error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Token generated successfully")

		// Extract token from response
		// API returns: { token: "..." } or { data: { token: "..." } }
		const token = result.token || result.data?.token

		if (!token) {
			console.error("❌ No token in response:", result)
			throw new Error("DocoChain did not return a token")
		}

		// Cache the token with expiration
		tokenCache.set(email, {
			token,
			expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
		})

		console.log("✅ Token cached for:", email)
		return token
	} catch (error) {
		console.error("❌ Error generating DocoChain token:", error)
		// Fallback to static token if available
		if (DOCOCHAIN_API_TOKEN) {
			console.warn("⚠️ Falling back to static token")
			return DOCOCHAIN_API_TOKEN
		}
		throw error
	}
}

/**
 * Get a valid DocoChain token for a user, generating a new one if needed
 * This function handles token caching and automatic refresh
 * 
 * @param email - The email address of the user
 * @param forceRefresh - Force a new token generation even if cached token exists
 * @returns A valid token string
 */
export async function getDocoChainToken(email?: string, forceRefresh = false): Promise<string> {
	// If email is provided, generate user-specific token
	if (email) {
		return generateDocoChainToken(email, forceRefresh)
	}
	
	// Otherwise, use static token or generate a default one
	if (DOCOCHAIN_API_TOKEN) {
		return DOCOCHAIN_API_TOKEN
	}
	
	// If no static token and no email, we can't generate a token
	throw new Error("Cannot generate token: email is required when DOCOCHAIN_API_TOKEN is not set")
}

/**
 * Make a DocoChain API call with automatic token refresh on 401 errors
 * This wrapper function ensures tokens are automatically refreshed when they expire
 * 
 * @param apiCall - A function that makes the API call and returns a Response
 * @param userEmail - The email address of the user (for token generation)
 * @param retryCount - Internal counter for retry attempts (max 1 retry)
 * @returns The API response
 */
export async function makeDocoChainApiCall(
	apiCall: (token: string) => Promise<Response>,
	userEmail?: string,
	retryCount = 0
): Promise<Response> {
	const maxRetries = 1 // Only retry once to avoid infinite loops
	
	try {
		// Get token (will be refreshed if about to expire)
		const token = await getDocoChainToken(userEmail)
		
		// Make the API call
		const response = await apiCall(token)
		
		// If we get a 401 Unauthorized, the token might have expired
		// Refresh the token and retry once
		if (response.status === 401 && retryCount < maxRetries && userEmail) {
			console.warn("⚠️ Received 401 Unauthorized, refreshing token and retrying...")
			console.log("   - User email:", userEmail)
			console.log("   - Retry attempt:", retryCount + 1)
			
			// Force refresh the token
			await getDocoChainToken(userEmail, true)
			
			// Retry the API call with the new token
			return makeDocoChainApiCall(apiCall, userEmail, retryCount + 1)
		}
		
		return response
	} catch (error) {
		// If token generation failed and we haven't retried, try once more
		if (retryCount < maxRetries && userEmail) {
			console.warn("⚠️ Error in API call, refreshing token and retrying...")
			console.log("   - Error:", error)
			
			// Force refresh the token
			await getDocoChainToken(userEmail, true)
			
			// Retry the API call with the new token
			return makeDocoChainApiCall(apiCall, userEmail, retryCount + 1)
		}
		
		throw error
	}
}

interface CreateProjectRequest {
	title: string
	documentFile: Buffer // PDF file buffer
	fileName: string
	userListEditable?: boolean // If false, recipients cannot be edited after creation
	creatorAsViewer?: boolean // If false, creator is not added as a viewer
}

interface DocoChainApiResponse {
	message: string
	data: {
		uuid: string
		id: number
		name: string
		status: string
		file_name: string
		url: string
		redirect_url?: string // Authenticated redirect URL with token
		// ... other fields
	}
	meta: Record<string, unknown>
}

interface AddSignatureMarkRequest {
	projectUuid: string
	signerId: number
	type: string // "signature" | "initials" | "text" | "date"
	position_x: number
	position_y: number
	height: number
	width: number
	page_no: string
}

/**
 * Create a new DocoChain project for document signing
 */
export async function createDocoChainProject({
	title,
	documentFile,
	fileName,
	userListEditable = false,
	creatorAsViewer = false,
	creatorEmail,
}: CreateProjectRequest & { creatorEmail?: string }): Promise<{ uuid: string; id: number; redirectUrl?: string }> {
	console.log("🔵 Starting DocoChain project creation...")
	console.log("   - Title:", title)
	console.log("   - File name:", fileName)
	console.log("   - File size:", documentFile.length, "bytes")
	console.log("   - API Base:", DOCOCHAIN_API_BASE)
	console.log("   - Creator Email:", creatorEmail || "not provided")
	
	try {
		const formData = new FormData()
		const fileBlob = new Blob([new Uint8Array(documentFile)], { type: "application/pdf" })
		formData.append("file", fileBlob, fileName)
		
		// Add optional parameters per API specification
		// user_list_editable: If false, recipients cannot be edited after creation
		formData.append("user_list_editable", String(userListEditable))
		
		// creator_as_viewer: If false, creator is not added as a viewer
		formData.append("creator_as_viewer", String(creatorAsViewer))

		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/projects?user_type=ENTERPRISE_API`
		console.log("🔵 Calling DocoChain API:", apiUrl)
		console.log("   - user_list_editable:", userListEditable)
		console.log("   - creator_as_viewer:", creatorAsViewer)

		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(apiUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
					body: formData,
				})
			},
			creatorEmail // Email of the creator
		)

		console.log("📡 DocoChain response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain API error response:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = (await response.json()) as DocoChainApiResponse
		console.log("📦 DocoChain API response:", result)
		
		if (!result.data?.uuid) {
			console.error("❌ No UUID in response:", result)
			throw new Error("DocoChain did not return a project UUID")
		}

		console.log("✅ DocoChain project created successfully!")
		console.log("   - UUID:", result.data.uuid)
		console.log("   - ID:", result.data.id)
		console.log("   - Redirect URL:", result.data.redirect_url)

		return {
			uuid: result.data.uuid,
			id: result.data.id,
			redirectUrl: result.data.redirect_url,
		}
	} catch (error) {
		console.error("❌ Error creating DocoChain project:", error)
		if (error instanceof Error) {
			console.error("❌ Error message:", error.message)
			console.error("❌ Error stack:", error.stack)
		}
		throw error
	}
}

/**
 * Add a signer to a DocoChain project
 */
export async function addSignerToProject({
	projectUuid,
	email,
	firstName,
	lastName,
	signerRole = "Signer",
	userEmail,
}: {
	projectUuid: string
	email: string
	firstName: string
	lastName: string
	signerRole?: string
	userEmail?: string // Email of the user making the API call (creator/ENP)
}) {
	console.log("🔵 Adding signer to DocoChain project...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Email:", email)
	console.log("   - Name:", firstName, lastName)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/signers?user_type=ENTERPRISE_API`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							email,
							first_name: firstName,
							last_name: lastName,
							type: "GUEST",
							signer_role: signerRole,
						}),
					}
				)
			},
			userEmail // Email of the user making the API call (creator/ENP)
		)

		console.log("📡 DocoChain add signer response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain add signer error:", errorText)
			
			// If signer already exists, verify it was actually added by checking project details
			if (response.status === 400) {
				if (errorText.includes("already") || errorText.includes("already been added")) {
					console.log("ℹ️ Signer already exists in project - verifying...")
					try {
						// Verify the signer exists by getting project details
						// Use userEmail to get proper token for project access
						const projectDetails = await getProjectDetails(projectUuid, userEmail)
						const signers = projectDetails?.data?.signers || []
						const signerExists = signers.some((s: { email: string }) => s.email === email)
						if (signerExists) {
							console.log("✅ Signer verified in project")
							return { message: "Signer already exists", verified: true }
						} else {
							console.warn("⚠️ Signer not found in project despite 'already exists' error")
							throw new Error(`Signer was not properly added to project: ${errorText}`)
						}
					} catch (verifyError) {
						console.error("❌ Failed to verify signer:", verifyError)
						// If verification fails but we got "already exists" error, assume it's fine
						console.log(`ℹ️ Signer already exists: ${  email}`)
						return { message: "Signer already exists", verified: true }
					}
				}
			}
			
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Signer added to DocoChain project:", result)

		return result
	} catch (error) {
		console.error("❌ Error adding signer to DocoChain project:", error)
		throw error
	}
}

/**
 * Auto-join a user to the DocoChain organization
 * This makes them an organization member instead of a guest
 * Requires organization_id to be set in environment variables
 */
export async function autoJoinOrganization({
	email,
	firstName,
	lastName,
	role = "Member",
	organizationId,
	userEmail,
}: {
	email: string
	firstName: string
	lastName: string
	role?: string
	organizationId?: string
	userEmail?: string // Email of the user making the API call
}): Promise<void> {
	console.log("🔵 Auto-joining user to DocoChain organization...")
	console.log("   - Email:", email)
	console.log("   - Name:", firstName, lastName)
	console.log("   - Role:", role)
	console.log("   - Organization ID:", organizationId || DOCOCHAIN_ORGANIZATION_ID)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		const orgId = organizationId || DOCOCHAIN_ORGANIZATION_ID
		if (!orgId) {
			console.warn("⚠️ Organization ID not configured. User will be added as GUEST.")
			return
		}

		const formData = new FormData()
		formData.append("data[0][email]", email)
		formData.append("data[0][first_name]", firstName)
		formData.append("data[0][last_name]", lastName)
		formData.append("data[0][role]", role)
		formData.append("data[0][organization_id]", orgId)

		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
						},
						body: formData,
					}
				)
			},
			userEmail // Email of the user making the API call
		)

		console.log("📡 DocoChain auto-join response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain auto-join error:", errorText)
			
			// Check if user already exists in organization (409 Conflict or 400 with specific message)
			if (response.status === 409) {
				console.log("ℹ️ User already exists in organization (409) - continuing...")
				return // Not a critical error
			}
			
			// Check for 400 error with "already exist" message
			if (response.status === 400 && errorText.includes("already exist")) {
				console.log("ℹ️ User already exists in organization (400) - continuing...")
				return // Not a critical error - user is already in the organization
			}
			
			// Check if unauthorized (need better token)
			if (response.status === 401 || response.status === 403) {
				console.warn("⚠️ API token doesn't have permission to add org members")
				console.warn("⚠️ User will be added as GUEST instead of organization member")
				return // Continue anyway
			}
			
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ User auto-joined to organization:", result)
	} catch (error) {
		console.error("❌ Error auto-joining user to organization:", error)
		// Don't throw - this is not critical, user can still be added as GUEST
		console.warn("⚠️ Continuing without organization membership...")
	}
}

/**
 * Get DocoChain project details including all signers
 */
export async function getProjectDetails(projectUuid: string, userEmail?: string): Promise<any> {
	console.log("🔵 Fetching DocoChain project details...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}?user_type=ENTERPRISE_API`,
					{
						method: "GET",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
						},
					}
				)
			},
			userEmail
		)

		console.log("📡 DocoChain get project response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain get project error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText}`)
		}

		const result = await response.json()
		console.log("✅ Project details fetched:", result)

		return result
	} catch (error) {
		console.error("❌ Error fetching project details:", error)
		throw error
	}
}

/**
 * Delete a signer from a DocoChain project
 */
export async function deleteSigner({
	projectUuid,
	signerId,
	userEmail,
}: {
	projectUuid: string
	signerId: number
	userEmail?: string // Email of the user making the API call
}): Promise<void> {
	console.log("🔵 Deleting signer from DocoChain project...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Signer ID:", signerId)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/signers/${signerId}?user_type=ENTERPRISE_API`,
					{
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
						},
					}
				)
			},
			userEmail // Email of the user making the API call
		)

		console.log("📡 DocoChain delete signer response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain delete signer error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText}`)
		}

		console.log("✅ Signer deleted from DocoChain project")
	} catch (error) {
		console.error("❌ Error deleting signer:", error)
		throw error
	}
}

/**
 * Add a signature mark/field to a DocoChain project
 */
export async function addSignatureMark({
	projectUuid,
	signerId,
	type,
	position_x,
	position_y,
	height,
	width,
	page_no,
}: AddSignatureMarkRequest) {
	try {
		const response = await fetch(
			`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/signers/${signerId}/properties?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					type,
					position_x,
					position_y,
					height,
					width,
					page_no,
				}),
			}
		)

		if (!response.ok) {
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText}`)
		}

		return await response.json()
	} catch (error) {
		console.error("Error adding signature mark:", error)
		throw error
	}
}

/**
 * Get DocoChain project details
 */
export async function getDocoChainProject(projectUuid: string) {
	try {
		const response = await fetch(`${DOCOCHAIN_API_BASE}/projects/${projectUuid}`, {
			headers: {
				Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
				Accept: "application/json",
			},
		})

		if (!response.ok) {
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText}`)
		}

		return await response.json()
	} catch (error) {
		console.error("Error getting DocoChain project:", error)
		throw error
	}
}

/**
 * Send/Deploy a DocoChain project to recipients
 * This activates the project and makes it accessible to signers
 */
export async function sendDocoChainProject(projectUuid: string, userEmail?: string) {
	console.log("🔵 Sending DocoChain project to recipients...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/my/projects/${projectUuid}/send?user_type=ENTERPRISE_API`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
						},
					}
				)
			},
			userEmail
		)

		console.log("📡 DocoChain send project response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain send project error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ DocoChain project sent successfully:", result)

		return result
	} catch (error) {
		console.error("❌ Error sending DocoChain project:", error)
		throw error
	}
}

/**
 * Generate a unique signing link for a specific project and recipient
 * This link can be sent to the user to access and sign the document
 * Uses the Generate Sign Link API: POST https://stg-app.doconchain.com/api/v2/projects/{uuid}/link/generate
 */
export async function generateSignLink({
	projectUuid,
	email,
}: {
	projectUuid: string
	email: string
}): Promise<{ link: string }> {
	console.log("🔵 Generating signing link...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Email:", email)

	try {
		// The endpoint is on the API domain, not the app domain
		// stg-app.doconchain.com is the frontend (Remix app), API endpoints are on stg-api2.doconchain.com
		// Endpoint: POST /api/v2/projects/{uuid}/link/generate?email={email}&user_type=ENTERPRISE_API
		// No body required, only email as query parameter
		// Adding user_type=ENTERPRISE_API like all other API endpoints
		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/link/generate?email=${encodeURIComponent(email)}&user_type=ENTERPRISE_API`
		console.log("🔵 Calling DocoChain Generate Sign Link API:", apiUrl)

		// Use the wrapper function for automatic token refresh on 401 errors
		// Generate token for the signer (the email parameter is the signer's email)
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(apiUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
					// No body required as per API documentation
				})
			},
			email // Use the signer's email for token generation
		)

		console.log("📡 DocoChain generate link response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain generate link error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Signing link generated successfully - FULL RESPONSE:", JSON.stringify(result, null, 2))

		// Extract the link from the response
		// The Generate Sign Link API should return the signing link directly
		// Try multiple possible locations in the response
		let link = result.data?.link || 
		           result.data?.url || 
		           result.data?.signing_link ||
		           result.data?.sign_url ||
		           result.link || 
		           result.url ||
		           result.signing_link ||
		           result.sign_url ||
		           result.message || 
		           result.data?.message

		console.log("✅ Extracted signing link (raw):", link)
		console.log("✅ Response structure:", {
			hasData: !!result.data,
			hasLink: !!result.link,
			hasUrl: !!result.url,
			hasMessage: !!result.message,
			keys: Object.keys(result),
			dataKeys: result.data ? Object.keys(result.data) : null,
		})

		if (!link) {
			console.error("❌ No link found in response. Full response:", result)
			// Fallback: Construct signing URL using project UUID directly
			console.log("⚠️ Falling back to direct project URL...")
			const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
				? 'https://stg-app.doconchain.com'
				: 'https://app.doconchain.com'
			link = `${appBaseUrl}/${projectUuid}`
			console.log("✅ Using fallback URL:", link)
		}

		// Ensure link is a valid URL
		if (typeof link === 'string' && !link.startsWith('http')) {
			console.warn("⚠️ Link doesn't start with http, might be invalid:", link)
			// If it's just a path, prepend the app base URL
			const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
				? 'https://stg-app.doconchain.com'
				: 'https://app.doconchain.com'
			if (link.startsWith('/')) {
				link = `${appBaseUrl}${link}`
			} else {
				link = `${appBaseUrl}/${link}`
			}
			console.log("✅ Constructed full URL:", link)
		}

		// Ensure link is always a string, never an object
		if (typeof link !== 'string') {
			console.error("❌ Link is not a string:", typeof link, link)
			// Fallback to direct project URL
			const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
				? 'https://stg-app.doconchain.com'
				: 'https://app.doconchain.com'
			link = `${appBaseUrl}/${projectUuid}`
			console.log("⚠️ Using fallback URL due to invalid link type:", link)
		}

		// Clean up the URL - remove api=null parameter if present
		// DocoChain sometimes adds ?api=null which causes issues
		try {
			const url = new URL(link)
			// Remove api parameter if it's null or empty
			if (url.searchParams.has('api') && (url.searchParams.get('api') === 'null' || url.searchParams.get('api') === '')) {
				url.searchParams.delete('api')
				link = url.toString()
				console.log("🧹 Cleaned URL - removed api=null parameter")
			}
		} catch (urlError) {
			// If URL parsing fails, try simple string replacement
			link = link.replace(/\?api=null(&|$)/, '?').replace(/&api=null(&|$)/, '&').replace(/\?$/, '')
			console.log("🧹 Cleaned URL using string replacement")
		}

		console.log("✅ Final signing link:", link)
		return { link }
	} catch (error) {
		console.error("❌ Error generating signing link:", error)
		throw error
	}
}

/**
 * Update a project signer
 * PUT /projects/{uuid}/signers/{signerId}?user_type=ENTERPRISE_API
 */
export async function updateProjectSigner({
	projectUuid,
	signerId,
	firstName,
	lastName,
	sequence,
	signerRole,
	userEmail,
}: {
	projectUuid: string
	signerId: string | number
	firstName: string
	lastName: string
	sequence: number
	signerRole: string
	userEmail?: string // Email of the user making the API call
}) {
	console.log("🔵 Updating project signer...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Signer ID:", signerId)
	console.log("   - Name:", firstName, lastName)
	console.log("   - Sequence:", sequence)
	console.log("   - Signer Role:", signerRole)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(
					`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/signers/${signerId}?user_type=ENTERPRISE_API`,
					{
						method: "PUT",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							first_name: firstName,
							last_name: lastName,
							sequence,
							signer_role: signerRole,
						}),
					}
				)
			},
			userEmail // Email of the user making the API call
		)

		console.log("📡 DocoChain update signer response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain update signer error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Signer updated successfully:", result)

		return result
	} catch (error) {
		console.error("❌ Error updating project signer:", error)
		throw error
	}
}

/**
 * Generate Edit Draft Project Link
 * This generates a link that allows editing/plotting/signing a draft project
 * POST https://stg-api2.doconchain.com/api/v2/projects/{uuid}/link?user_type=ENTERPRISE_API
 */
export async function generateEditDraftLink(projectUuid: string, userEmail?: string): Promise<{ link: string }> {
	console.log("🔵 Generating edit draft project link...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`
		console.log("🔵 Calling DocoChain Generate Edit Draft Link API:", apiUrl)

		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(apiUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				})
			},
			userEmail // Email of the user (creator/ENP)
		)

		console.log("📡 DocoChain generate edit draft link response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain generate edit draft link error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Edit draft link generated successfully - FULL RESPONSE:", JSON.stringify(result, null, 2))

		// Extract the link from the response
		// API returns: { message: { message: "...", link: "..." } }
		// OR: { message: "..." } (string)
		// OR: { data: { link: "..." } }
		let link = result.message?.link ||  // If message is an object with link property
		           (typeof result.message === 'string' ? result.message : null) ||  // If message is a string (link)
		           result.data?.link || 
		           result.data?.url || 
		           result.link || 
		           result.url ||
		           result.data?.message

		console.log("✅ Extracted edit draft link (raw):", link)

		if (!link) {
			console.error("❌ No link found in response. Full response:", result)
			throw new Error(`DocoChain did not return a valid edit draft link. Response: ${JSON.stringify(result)}`)
		}

		// Ensure link is a valid URL
		if (typeof link === 'string' && !link.startsWith('http')) {
			console.warn("⚠️ Link doesn't start with http, might be invalid:", link)
			// If it's just a path, prepend the app base URL
			const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
				? 'https://stg-app.doconchain.com'
				: 'https://app.doconchain.com'
			if (link.startsWith('/')) {
				link = `${appBaseUrl}${link}`
			} else {
				link = `${appBaseUrl}/${link}`
			}
			console.log("✅ Constructed full URL:", link)
		}

		// Ensure link is always a string, never an object
		if (typeof link !== 'string') {
			console.error("❌ Link is not a string:", typeof link, link)
			throw new Error(`Invalid link type: expected string, got ${typeof link}`)
		}

		// Clean up the URL - remove api=null parameter if present
		// DocoChain sometimes adds ?api=null which causes issues
		try {
			const url = new URL(link)
			// Remove api parameter if it's null or empty
			if (url.searchParams.has('api') && (url.searchParams.get('api') === 'null' || url.searchParams.get('api') === '')) {
				url.searchParams.delete('api')
				link = url.toString()
				console.log("🧹 Cleaned URL - removed api=null parameter")
			}
		} catch (urlError) {
			// If URL parsing fails, try simple string replacement
			link = link.replace(/\?api=null(&|$)/, '?').replace(/&api=null(&|$)/, '&').replace(/\?$/, '')
			console.log("🧹 Cleaned URL using string replacement")
		}

		console.log("✅ Final edit draft link:", link)
		return { link }
	} catch (error) {
		console.error("❌ Error generating edit draft link:", error)
		throw error
	}
}

/**
 * Check if a document/project is fully signed
 * Returns signing status information including signer details
 */
export interface SigningStatusResult {
	isFullySigned: boolean
	projectStatus: string // "Draft" | "Sent" | "Completed" | etc.
	completedAt: string | null
	totalSigners: number
	signedCount: number
	signers: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string // "PENDING" | "SIGNED" | "DECLINED" | etc.
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
}

export async function checkSigningStatus(projectUuid: string, userEmail?: string): Promise<SigningStatusResult> {
	console.log("🔵 Checking signing status for project...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		const projectDetails = await getProjectDetails(projectUuid, userEmail)
		const projectData = projectDetails?.data

		if (!projectData) {
			throw new Error("Project not found or invalid response")
		}

		const signers = projectData.signers || []
		const signedSigners = signers.filter((s: { status: string; signed_at: string | null }) => 
			s.status === "SIGNED" || s.signed_at !== null
		)

		const isFullySigned = signers.length > 0 && signedSigners.length === signers.length && 
			(projectData.status === "Completed" || projectData.completed_at !== null)

		console.log("✅ Signing status checked:")
		console.log("   - Project Status:", projectData.status)
		console.log("   - Total Signers:", signers.length)
		console.log("   - Signed Count:", signedSigners.length)
		console.log("   - Is Fully Signed:", isFullySigned)

		return {
			isFullySigned,
			projectStatus: projectData.status || "Unknown",
			completedAt: projectData.completed_at || null,
			totalSigners: signers.length,
			signedCount: signedSigners.length,
			signers: signers.map((s: any) => ({
				id: s.id,
				email: s.email,
				firstName: s.first_name || "",
				lastName: s.last_name || "",
				status: s.status || "PENDING",
				signedAt: s.signed_at || null,
				sequence: s.sequence || 0,
				signerRole: s.signer_role || s.role || "",
			})),
		}
	} catch (error) {
		console.error("❌ Error checking signing status:", error)
		throw error
	}
}

/**
 * Download the signed document from DocoChain
 * Returns the signed PDF as a Buffer
 */
export async function downloadSignedDocument(projectUuid: string, userEmail?: string): Promise<{ buffer: Buffer; fileName: string; url: string }> {
	console.log("🔵 Downloading signed document from DocoChain...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		const projectDetails = await getProjectDetails(projectUuid, userEmail)
		const projectData = projectDetails?.data

		if (!projectData) {
			throw new Error("Project not found or invalid response")
		}

		// Get the signed document URL from project data
		// DocoChain provides the signed document URL in the 'url' field when completed
		const signedDocumentUrl = projectData.url

		if (!signedDocumentUrl) {
			throw new Error("Signed document URL not available. Document may not be fully signed yet.")
		}

		console.log("📥 Fetching signed document from:", signedDocumentUrl)

		// Download the PDF from DocoChain CDN
		const response = await fetch(signedDocumentUrl)

		if (!response.ok) {
			throw new Error(`Failed to download signed document: ${response.status} ${response.statusText}`)
		}

		const arrayBuffer = await response.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		const fileName = projectData.file_name || projectData.name || `signed-document-${projectUuid}.pdf`

		console.log("✅ Signed document downloaded successfully")
		console.log("   - File name:", fileName)
		console.log("   - File size:", buffer.length, "bytes")

		return {
			buffer,
			fileName,
			url: signedDocumentUrl,
		}
	} catch (error) {
		console.error("❌ Error downloading signed document:", error)
		throw error
	}
}

/**
 * Download the certificate of completion from DocoChain
 * Returns the certificate PDF as a Buffer
 * Includes retry mechanism to handle cases where certificate URL is not immediately available after signing
 */
export async function downloadCertificate(projectUuid: string, userEmail?: string): Promise<{ buffer: Buffer; fileName: string; url: string }> {
	console.log("🔵 Downloading certificate from DocoChain...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - User Email (for token):", userEmail || "not provided")

	// Retry configuration - certificate may not be immediately available after signing
	const maxRetries = 3
	const retryDelayMs = 2000 // 2 seconds between retries

	const attemptToGetCertificateUrl = async (attempt: number): Promise<string | null> => {
		if (attempt > 1) {
			console.log(`🔄 Retry attempt ${attempt}/${maxRetries} to get certificate URL...`)
			// Wait before retrying (exponential backoff)
			await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt - 1)))
		}

		try {
			// First, get project details to check if certificate URL is available
			// (getProjectDetails already uses automatic token refresh)
			const projectDetails = await getProjectDetails(projectUuid, userEmail)
			const projectData = projectDetails?.data

			if (!projectData) {
				return null
			}

			// Try to get certificate URL from project data first
			let certificateUrl = projectData.certificate_url || projectData.certificateUrl || projectData.cert_url

			// If not in project data, try Passport API to get certificate URL
			if (!certificateUrl) {
				console.log("🔵 Certificate URL not in project data, trying Passport API...")
				try {
					const passportData = await getPassportDocument(projectUuid, "certificate_url", userEmail)
					
					// Handle case where response is a string URL directly
					if (typeof passportData === "string" && passportData.startsWith("http")) {
						certificateUrl = passportData
						console.log("✅ Certificate URL returned directly as string from Passport API")
					} else {
						// Extract certificate URL from passport response object
						// The response structure may vary, try multiple possible locations
						certificateUrl = passportData?.data?.certificate_url || 
						                passportData?.data?.certificateUrl || 
						                passportData?.data?.cert_url ||
						                passportData?.data?.url ||
						                passportData?.certificate_url ||
						                passportData?.certificateUrl ||
						                passportData?.cert_url ||
						                passportData?.url ||
						                (typeof passportData?.data === "string" && passportData.data.startsWith("http") ? passportData.data : null)
					}
					
					// If certificateUrl is still not found, log the full response for debugging (only on first attempt)
					if (!certificateUrl && attempt === 1) {
						console.warn("⚠️ Passport API response structure:")
						console.warn("   - Full response:", JSON.stringify(passportData, null, 2))
						console.warn("   - Response keys:", Object.keys(passportData || {}))
						if (passportData?.data) {
							console.warn("   - Data keys:", Object.keys(passportData.data))
						}
					} else if (certificateUrl) {
						console.log("✅ Certificate URL found via Passport API:", certificateUrl)
					}
				} catch (passportError) {
					console.warn("⚠️ Failed to get certificate URL from Passport API:", passportError)
					// Continue to try other methods
				}
			}

			return certificateUrl || null
		} catch (error) {
			console.warn(`⚠️ Error getting certificate URL (attempt ${attempt}):`, error)
			return null
		}
	}

	try {
		// Try to get certificate URL with retries
		let certificateUrl: string | null = null
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			certificateUrl = await attemptToGetCertificateUrl(attempt)
			if (certificateUrl) {
				break
			}
		}

		// If still no certificate URL after retries, try different endpoint formats
		if (!certificateUrl) {
			console.log("🔵 Certificate URL not found after retries, trying direct endpoint formats...")
			// Determine app base URL (for certificate downloads, might need app URL instead of API URL)
			const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
				? 'https://stg-app.doconchain.com'
				: 'https://app.doconchain.com'
			
			// Try multiple possible endpoint formats
			const possibleEndpoints = [
				// Try API endpoints first
				`${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
				`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
				`${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/certificate/download?user_type=ENTERPRISE_API`,
				`${DOCOCHAIN_API_BASE}/my/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
				// Try app endpoints (might require different auth or be publicly accessible)
				`${appBaseUrl}/api/v2/projects/${projectUuid}/certificate?user_type=ENTERPRISE_API`,
				`${appBaseUrl}/projects/${projectUuid}/certificate`,
			]

			for (const endpoint of possibleEndpoints) {
				try {
					console.log(`📥 Trying certificate endpoint: ${endpoint}`)
					// Use the wrapper function for automatic token refresh on 401 errors
					const response = await makeDocoChainApiCall(
						async (token) => {
							return fetch(endpoint, {
								method: "GET",
								headers: {
									Authorization: `Bearer ${token}`,
									Accept: "application/pdf",
								},
							})
						},
						userEmail
					)

					if (response.ok) {
						const arrayBuffer = await response.arrayBuffer()
						const buffer = Buffer.from(arrayBuffer)
						const fileName = `certificate-${projectUuid}.pdf`

						console.log("✅ Certificate downloaded successfully")
						console.log("   - File name:", fileName)
						console.log("   - File size:", buffer.length, "bytes")

						return {
							buffer,
							fileName,
							url: endpoint,
						}
					} else if (response.status !== 404) {
						// If it's not a 404, log the error but continue trying other endpoints
						const errorText = await response.text()
						console.warn(`⚠️ Endpoint ${endpoint} returned ${response.status}: ${errorText}`)
					}
				} catch (endpointError) {
					console.warn(`⚠️ Error trying endpoint ${endpoint}:`, endpointError)
					continue
				}
			}

			// If all endpoints failed, provide helpful error message
			console.error("❌ All certificate endpoints failed. Certificate might be embedded in the signed PDF.")
			throw new Error(
				"Certificate download endpoint not available. " +
				"The certificate may be embedded in the signed PDF document. " +
				"Please download the signed document to access the certificate."
			)
		} else {
			// Certificate URL was found, download from that URL
			console.log("📥 Fetching certificate from URL:", certificateUrl)
			// Use the wrapper function for automatic token refresh on 401 errors
			const response = await makeDocoChainApiCall(
				async (token) => {
					return fetch(certificateUrl, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/pdf",
						},
					})
				},
				userEmail
			)

			if (!response.ok) {
				const errorText = await response.text()
				console.error("❌ DocoChain certificate download error:", errorText)
				throw new Error(`Failed to download certificate: ${response.status} ${response.statusText} - ${errorText}`)
			}

			const arrayBuffer = await response.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)
			const fileName = `certificate-${projectUuid}.pdf`

			console.log("✅ Certificate downloaded successfully")
			console.log("   - File name:", fileName)
			console.log("   - File size:", buffer.length, "bytes")

			return {
				buffer,
				fileName,
				url: certificateUrl,
			}
		}
	} catch (error) {
		console.error("❌ Error downloading certificate:", error)
		throw error
	}
}

/**
 * Get Passport Document from DocoChain
 * Retrieves the Passport details of a specific document including audit trail, blockchain hash, user data, etc.
 * API: GET /api/v2/projects/{uuid}/passport?user_type=ENTERPRISE_API&view={view}
 * 
 * @param projectUuid - The unique identifier of the project
 * @param view - The view type: 'blockchain', 'history', 'user_data', 'verifiable_presentation', or 'certificate_url'
 * @param userEmail - Email of the user making the API call (for token generation)
 * @returns The passport document data
 */
export async function getPassportDocument(
	projectUuid: string,
	view: "blockchain" | "history" | "user_data" | "verifiable_presentation" | "certificate_url" = "blockchain",
	userEmail?: string
): Promise<any> {
	console.log("🔵 Getting Passport Document from DocoChain...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - View:", view)
	console.log("   - User Email (for token):", userEmail || "not provided")

	try {
		// Build the API URL with query parameters
		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/passport?user_type=ENTERPRISE_API&view=${view}`
		console.log("🔵 Calling DocoChain Passport API:", apiUrl)

		// Use the wrapper function for automatic token refresh on 401 errors
		const response = await makeDocoChainApiCall(
			async (token) => {
				return fetch(apiUrl, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				})
			},
			userEmail // Email of the user
		)

		console.log("📡 DocoChain passport response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain passport error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Passport document retrieved successfully")
		console.log("   - View type:", view)
		console.log("   - Response keys:", Object.keys(result))

		return result
	} catch (error) {
		console.error("❌ Error getting passport document:", error)
		throw error
	}
}

/**
 * Generate DocoChain signing URL
 */
export function getDocoChainSigningUrl(projectUuid: string): string {
	// Use staging app URL if using staging API, otherwise production
	const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
		? 'https://stg-app.doconchain.com'
		: 'https://app.doconchain.com'
	
	return `${appBaseUrl}/${projectUuid}`
}

