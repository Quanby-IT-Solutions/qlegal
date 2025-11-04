/**
 * DocoChain API Integration Service
 * API Base URL: https://stg-api2.doconchain.com
 */

const DOCOCHAIN_API_BASE = process.env.DOCOCHAIN_API_URL || "https://stg-api2.doconchain.com"
const DOCOCHAIN_API_TOKEN = process.env.DOCOCHAIN_API_TOKEN || ""

interface CreateProjectRequest {
	title: string
	documentFile: Buffer // PDF file buffer
	fileName: string
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
}: CreateProjectRequest): Promise<{ uuid: string; id: number; redirectUrl?: string }> {
	console.log("🔵 Starting DocoChain project creation...")
	console.log("   - Title:", title)
	console.log("   - File name:", fileName)
	console.log("   - File size:", documentFile.length, "bytes")
	console.log("   - API Base:", DOCOCHAIN_API_BASE)
	console.log("   - Has Token:", !!DOCOCHAIN_API_TOKEN)
	
	try {
		if (!DOCOCHAIN_API_TOKEN) {
			throw new Error("DocoChain API token not configured. Set DOCOCHAIN_API_TOKEN in .env.local")
		}

		const formData = new FormData()
		const fileBlob = new Blob([new Uint8Array(documentFile)], { type: "application/pdf" })
		formData.append("file", fileBlob, fileName)

		const apiUrl = `${DOCOCHAIN_API_BASE}/api/v2/projects?user_type=ENTERPRISE_API`
		console.log("🔵 Calling DocoChain API:", apiUrl)

		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
				Accept: "application/json",
			},
			body: formData,
		})

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
}: {
	projectUuid: string
	email: string
	firstName: string
	lastName: string
	signerRole?: string
}) {
	console.log("🔵 Adding signer to DocoChain project...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Email:", email)
	console.log("   - Name:", firstName, lastName)

	try {
		if (!DOCOCHAIN_API_TOKEN) {
			throw new Error("DocoChain API token not configured")
		}

		const response = await fetch(
			`${DOCOCHAIN_API_BASE}/projects/${projectUuid}/signers?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
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

		console.log("📡 DocoChain add signer response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain add signer error:", errorText)
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
export async function sendDocoChainProject(projectUuid: string) {
	console.log("🔵 Sending DocoChain project to recipients...")
	console.log("   - Project UUID:", projectUuid)

	try {
		if (!DOCOCHAIN_API_TOKEN) {
			throw new Error("DocoChain API token not configured")
		}

		const response = await fetch(
			`${DOCOCHAIN_API_BASE}/my/projects/${projectUuid}/send?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
					Accept: "application/json",
				},
			}
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
 * Generate a personalized signing link for a specific user
 * This creates a secure, email-specific link for signing
 */
export async function generateSignLink({
	projectUuid,
	email,
}: {
	projectUuid: string
	email: string
}): Promise<string> {
	console.log("🔵 Generating signing link for user...")
	console.log("   - Project UUID:", projectUuid)
	console.log("   - Email:", email)

	try {
		if (!DOCOCHAIN_API_TOKEN) {
			throw new Error("DocoChain API token not configured")
		}

		const response = await fetch(
			`${DOCOCHAIN_API_BASE}/api/v2/projects/${projectUuid}/link/generate?email=${encodeURIComponent(email)}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${DOCOCHAIN_API_TOKEN}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			}
		)

		console.log("📡 DocoChain generate link response status:", response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error("❌ DocoChain generate link error:", errorText)
			throw new Error(`DocoChain API error: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const result = await response.json()
		console.log("✅ Signing link generated successfully:", result)

		// The API returns the signing link in different possible fields
		// Check all possible locations: message, data.link, link, data.url, url
		const signingLink = result.message || result.data?.link || result.link || result.data?.url || result.url
		
		if (!signingLink) {
			console.error("❌ No signing link in response:", result)
			throw new Error("DocoChain did not return a signing link")
		}

		console.log("🔗 Generated signing link:", signingLink)
		return signingLink
	} catch (error) {
		console.error("❌ Error generating signing link:", error)
		throw error
	}
}

/**
 * Generate DocoChain signing URL (fallback method)
 */
export function getDocoChainSigningUrl(projectUuid: string): string {
	// Use staging app URL if using staging API, otherwise production
	const appBaseUrl = DOCOCHAIN_API_BASE.includes('stg') 
		? 'https://stg-app.doconchain.com'
		: 'https://app.doconchain.com'
	
	return `${appBaseUrl}/${projectUuid}`
}

