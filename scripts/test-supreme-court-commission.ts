/**
 * Test script for Supreme Court commission status API.
 * Run: pnpm exec tsx scripts/test-supreme-court-commission.ts
 *
 * Requires .env with:
 *   SUPREME_COURT_API_URL
 *   SUPREME_COURT_COGNITO_URL
 *   SUPREME_COURT_CLIENT_ID
 *   SUPREME_COURT_USERNAME
 *   SUPREME_COURT_PASSWORD
 */
import "dotenv/config"

import { getCommissionStatus } from "@/services/supreme-court/api/commission-status"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	console.log("🔵 Testing Supreme Court Commission Status API...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_COGNITO_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	try {
		const result = await getCommissionStatus("NPN-2", "RN-2")
		console.log("✅ Success!")
		console.log("   Commission Status:", result.commissionStatus)
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

main()
