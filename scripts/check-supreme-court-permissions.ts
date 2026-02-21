/**
 * Check Supreme Court API permissions for the current Cognito user.
 * Run: pnpm exec tsx scripts/check-supreme-court-permissions.ts
 *
 * This script will:
 * 1. Authenticate with Cognito
 * 2. Decode the token to show user groups and info
 * 3. Test various endpoints to see what permissions are available
 */

import "dotenv/config"

import { get, post } from "@/services/supreme-court/lib/http-client"
import { decodeToken, getToken, isConfigured } from "@/services/supreme-court/lib/token-cache"

import { env } from "@/env"

interface EndpointTest {
	name: string
	method: "GET" | "POST"
	path: string
	description: string
	requiresBody?: boolean
}

const endpointsToTest: EndpointTest[] = [
	{
		name: "Commission Status",
		method: "POST",
		path: "/public-use/cs",
		description: "Check notary commission status",
		requiresBody: true,
	},
	{
		name: "Create Metadata",
		method: "POST",
		path: "/public-use/metadata",
		description: "Create notarial act metadata",
		requiresBody: true,
	},
	{
		name: "Create Metadata (Consolidated)",
		method: "POST",
		path: "/public-use/consolidated",
		description: "Create metadata with principals/witnesses",
		requiresBody: true,
	},
	{
		name: "Get Presigned URL",
		method: "POST",
		path: "/public-use/presigned-url",
		description: "Get S3 presigned URL for file upload",
		requiresBody: true,
	},
	{
		name: "Register File",
		method: "POST",
		path: "/public-use/file",
		description: "Register file metadata",
		requiresBody: true,
	},
	{
		name: "Create Principals",
		method: "POST",
		path: "/public-use/principal",
		description: "Add principals to notarial act",
		requiresBody: true,
	},
	{
		name: "Create Witnesses",
		method: "POST",
		path: "/public-use/witness",
		description: "Add witnesses to notarial act",
		requiresBody: true,
	},
]

async function testEndpoint(test: EndpointTest): Promise<{
	allowed: boolean
	status?: number
	error?: string
}> {
	try {
		if (test.method === "GET") {
			const response = await get(test.path)
			return {
				allowed: response.ok || response.status === 404 || response.status === 400,
				status: response.status,
			}
		} else {
			// For POST requests, we'll send a minimal test body
			// Most endpoints will reject with 400 (bad request) if we have permission but wrong data
			// 403 means no permission, 400 means permission but validation error
			const testBody = test.requiresBody ? {} : undefined
			const response = await post(test.path, testBody ?? {})

			// 400/404/422 = we have permission but validation error (expected)
			// 403 = no permission
			// 401 = auth issue
			const hasPermission =
				response.ok || response.status === 400 || response.status === 404 || response.status === 422

			if (!hasPermission && response.status === 403) {
				const errorText = await response.text().catch(() => "Unknown error")
				return {
					allowed: false,
					status: response.status,
					error: errorText.substring(0, 200),
				}
			}

			return {
				allowed: hasPermission,
				status: response.status,
			}
		}
	} catch (error) {
		return {
			allowed: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

async function main() {
	console.log("🔵 Checking Supreme Court API Permissions...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	try {
		// Step 1: Authenticate and get token
		console.log("📋 Step 1: Authenticating with Cognito...")
		const token = await getToken()
		console.log("✅ Authentication successful\n")

		// Step 2: Decode token to show user info
		console.log("📋 Step 2: Decoding token...")
		const decoded = decodeToken(token)

		console.log("📊 User Information:")
		console.log(`   - Username: ${decoded.username ?? "N/A"}`)
		console.log(`   - User ID: ${decoded.sub ?? "N/A"}`)
		console.log(`   - Cognito Groups: ${decoded.groups?.join(", ") ?? "None"}`)
		if (decoded.exp) {
			const expiresAt = new Date(decoded.exp * 1000)
			console.log(`   - Token Expires: ${expiresAt.toISOString()}`)
		}
		console.log()

		// Step 3: Test endpoints
		console.log("📋 Step 3: Testing endpoint permissions...")
		console.log(`   Base URL: ${env.SUPREME_COURT_API_URL}\n`)

		const results: Array<{
			test: EndpointTest
			result: { allowed: boolean; status?: number; error?: string }
		}> = []

		for (const endpoint of endpointsToTest) {
			process.stdout.write(`   Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})... `)
			const result = await testEndpoint(endpoint)
			results.push({ test: endpoint, result })

			if (result.allowed) {
				console.log(`✅ Allowed (status: ${result.status ?? "OK"})`)
			} else {
				console.log(`❌ Denied (status: ${result.status ?? "Error"})`)
				if (result.error) {
					console.log(`      Error: ${result.error}`)
				}
			}
		}

		// Step 4: Summary
		console.log("\n📊 Permission Summary:")
		console.log("─".repeat(80))

		const allowed = results.filter(r => r.result.allowed)
		const denied = results.filter(r => !r.result.allowed)

		console.log(`\n✅ Allowed Endpoints (${allowed.length}):`)
		if (allowed.length > 0) {
			allowed.forEach(({ test, result }) => {
				console.log(`   • ${test.name} (${test.method} ${test.path})`)
				console.log(`     Status: ${result.status ?? "OK"}`)
			})
		} else {
			console.log("   None")
		}

		console.log(`\n❌ Denied Endpoints (${denied.length}):`)
		if (denied.length > 0) {
			denied.forEach(({ test, result }) => {
				console.log(`   • ${test.name} (${test.method} ${test.path})`)
				console.log(`     Status: ${result.status ?? "Error"}`)
				if (result.error) {
					console.log(`     Error: ${result.error.substring(0, 100)}`)
				}
			})
		} else {
			console.log("   None - All endpoints are accessible!")
		}

		console.log("\n💡 Recommendations:")
		if (decoded.groups?.includes("API-Guest")) {
			console.log("   ⚠️  You are in the 'API-Guest' group, which typically has read-only access.")
			console.log("   📧 Contact Supreme Court API administrators to request write permissions.")
			console.log(
				"   📝 Ask to be added to a group with write access (e.g., 'API-User' or 'API-Write')."
			)
		}

		if (denied.length > 0) {
			console.log(
				`   📧 Contact Supreme Court API administrators to request access to ${denied.length} denied endpoint(s).`
			)
		}

		if (allowed.length === endpointsToTest.length) {
			console.log("   ✅ You have full access to all tested endpoints!")
		}

		console.log()
	} catch (error) {
		console.error("\n❌ Error checking permissions:")
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

main()
