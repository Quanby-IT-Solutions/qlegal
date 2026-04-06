/**
 * Test script for Supreme Court Create Principal API.
 * Run: pnpm exec tsx scripts/test-supreme-court-principal.ts [NRID]
 *
 * Example:
 *   pnpm exec tsx scripts/test-supreme-court-principal.ts NRID-683d5d1fb5ae63f47af30312
 *
 * Requires .env with:
 *   SUPREME_COURT_API_URL
 *   SUPREME_COURT_AUTH_URL
 *   SUPREME_COURT_CLIENT_ID
 *   SUPREME_COURT_USERNAME
 *   SUPREME_COURT_PASSWORD
 */
import "dotenv/config"

import { createPrincipals } from "@/services/supreme-court/api/principal"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	console.log("🔵 Testing Supreme Court Create Principal API...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	// NRID must be from an existing notarial act in Supreme Court (e.g. from a recent sync)
	const notarialRegistryID = process.argv[2]

	if (!notarialRegistryID?.startsWith("NRID-")) {
		console.error("❌ Pass a valid NRID from an existing act (e.g. from a recent sync).")
		console.error("   Usage: pnpm test:supreme-court-principal <NRID>")
		console.error("   Example: pnpm test:supreme-court-principal NRID-698bea057039a3a0d114650e")
		console.error("   Get an NRID by running: pnpm test:supreme-court-sync <notarial-act-id>")
		process.exit(1)
	}

	// Test data matching PDF example (2 principals)
	const testPrincipals = [
		{
			principalName: "John Doe",
			principalAddress: {
				homeStreet: "Tala",
				barangay: "188",
				cityProvince: "Caloocan City",
			},
		},
		{
			principalName: "Jane Doe",
			principalAddress: {
				homeStreet: "Bagong Silang",
				barangay: "176",
				cityProvince: "Caloocan City",
			},
		},
	]

	console.log("📋 Test Configuration:")
	console.log(`   NRID: ${notarialRegistryID}`)
	console.log(`   Principals: ${testPrincipals.length}`)
	testPrincipals.forEach((p, i) => {
		console.log(`   ${i + 1}. ${p.principalName}`)
		console.log(
			`      Address: ${p.principalAddress.homeStreet}, ${p.principalAddress.barangay}, ${p.principalAddress.cityProvince}`
		)
	})
	console.log()

	try {
		console.log("🔵 Creating principals...")
		const result = await createPrincipals(notarialRegistryID, testPrincipals)

		console.log("✅ Success!")
		console.log(`   Message: ${result.message}`)
		console.log(`   NRID: ${notarialRegistryID}`)
		console.log(`   Principals added: ${testPrincipals.length}`)
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

void main()
