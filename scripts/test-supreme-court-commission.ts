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

	// Test data matching PDF example
	const testNPN = process.argv[2] || "NPN-2"
	const testRN = process.argv[3] || "RN-2"

	console.log("📋 Test Configuration:")
	console.log(`   NPN: ${testNPN}`)
	console.log(`   RN: ${testRN}`)
	console.log()

	try {
		console.log("🔵 Checking commission status...")
		const result = await getCommissionStatus(testNPN, testRN)
		
		console.log("✅ Success!")
		console.log(`   Commission Status: ${result.commissionStatus}`)
		
		if (result.commissionStatus === "Active") {
			console.log("   ✅ Notary commission is Active - can proceed with notarization")
		} else if (result.commissionStatus === "Inactive") {
			console.log("   ⚠️  Notary commission is Inactive - cannot create notarial metadata")
		} else {
			console.log(`   ⚠️  Unknown status: ${result.commissionStatus}`)
		}
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

main()
