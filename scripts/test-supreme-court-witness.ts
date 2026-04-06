/**
 * Test script for Supreme Court Create Witness API.
 * Run: pnpm exec tsx scripts/test-supreme-court-witness.ts [NRID]
 *
 * Example:
 *   pnpm exec tsx scripts/test-supreme-court-witness.ts NRID-683d5d1fb5ae63f47af30312
 *
 * Requires .env with:
 *   SUPREME_COURT_API_URL
 *   SUPREME_COURT_AUTH_URL
 *   SUPREME_COURT_CLIENT_ID
 *   SUPREME_COURT_USERNAME
 *   SUPREME_COURT_PASSWORD
 */
import "dotenv/config"

import { createWitnesses } from "@/services/supreme-court/api/witness"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	console.log("🔵 Testing Supreme Court Create Witness API...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	// Get NRID from command line or use example from PDF
	const notarialRegistryID = process.argv[2] ?? "NRID-683d5d1fb5ae63f47af30312"

	if (!notarialRegistryID.startsWith("NRID-")) {
		console.error("❌ Invalid NRID format. Must start with 'NRID-'")
		console.error("   Example: NRID-683d5d1fb5ae63f47af30312")
		process.exit(1)
	}

	// Test data matching PDF example
	const testWitnesses = [
		{
			witnessName: "John Doe",
			witnessAddress: {
				homeStreet: "Tala",
				barangay: "188",
				cityProvince: "Caloocan City",
			},
		},
	]

	console.log("📋 Test Configuration:")
	console.log(`   NRID: ${notarialRegistryID}`)
	console.log(`   Witnesses: ${testWitnesses.length}`)
	testWitnesses.forEach((w, i) => {
		console.log(`   ${i + 1}. ${w.witnessName}`)
		console.log(
			`      Address: ${w.witnessAddress.homeStreet}, ${w.witnessAddress.barangay}, ${w.witnessAddress.cityProvince}`
		)
	})
	console.log()

	try {
		console.log("🔵 Creating witnesses...")
		const result = await createWitnesses(notarialRegistryID, testWitnesses)

		console.log("✅ Success!")
		console.log(`   Message: ${result.message}`)
		console.log(`   NRID: ${notarialRegistryID}`)
		console.log(`   Witnesses added: ${testWitnesses.length}`)
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

void main()
