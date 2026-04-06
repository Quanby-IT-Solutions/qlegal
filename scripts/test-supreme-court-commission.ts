/**
 * Test script for Supreme Court commission status API.
 * Run: pnpm exec tsx scripts/test-supreme-court-commission.ts
 *
 * Requires .env with:
 *   SUPREME_COURT_API_URL
 *   SUPREME_COURT_AUTH_URL
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
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	// Test data: NPN and RN (from your ENP profile / Supreme Court), not an act ID
	const testNPN = process.argv[2] ?? "NPN-2"
	const testRN = process.argv[3] ?? "RN-2"

	// If first arg looks like a UUID (e.g. act ID), show correct usage
	const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		testNPN
	)
	if (looksLikeUuid) {
		console.error(
			"❌ This script expects NPN and RN (from your Licensing profile), not a notarial act ID."
		)
		console.error("")
		console.error("   Usage: pnpm test:supreme-court [NPN] [RN]")
		console.error("   Example: pnpm test:supreme-court NPN-456 RN-2")
		console.error("")
		console.error("   Use the NPN and NFN/RN values from your Profile → Licensing form.")
		console.error("   To test syncing an act, use: pnpm test:supreme-court-sync <act-id>")
		process.exit(1)
	}

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

void main()
