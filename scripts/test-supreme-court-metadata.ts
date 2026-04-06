/**
 * Test script for Supreme Court Create Metadata API.
 * Run: pnpm exec tsx scripts/test-supreme-court-metadata.ts
 *
 * Requires .env with:
 *   SUPREME_COURT_API_URL
 *   SUPREME_COURT_AUTH_URL
 *   SUPREME_COURT_CLIENT_ID
 *   SUPREME_COURT_USERNAME
 *   SUPREME_COURT_PASSWORD
 */
import "dotenv/config"

import { createMetadata } from "@/services/supreme-court/api/metadata"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	console.log("🔵 Testing Supreme Court Create Metadata API...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	// Test data: real NPN/NFN/RN (commission Active, accredited Active)
	const testRequest = {
		notaryFacilityNumber: "NFN-2025-00017",
		notaryPublicNumber: "NPN-2025-00019",
		rollNumber: "RN-12341",
		metaData: {
			dateNotarized: "2025-06-03",
			notarialActType: "Acknowledgment" as const,
			notarialPageNumber: 1,
			notarialBookNumber: 1,
			description: "Test document",
			modeOfNotarization: "In-person" as const,
			remarks: "Sample",
			dateUpdated: "2025-05-12",
		},
	}

	console.log("📋 Test Configuration:")
	console.log(`   NFN: ${testRequest.notaryFacilityNumber}`)
	console.log(`   NPN: ${testRequest.notaryPublicNumber}`)
	console.log(`   RN: ${testRequest.rollNumber}`)
	console.log(`   Date Notarized: ${testRequest.metaData.dateNotarized}`)
	console.log(`   Act Type: ${testRequest.metaData.notarialActType}`)
	console.log(`   Mode: ${testRequest.metaData.modeOfNotarization}`)
	console.log(`   Description: ${testRequest.metaData.description}`)
	console.log()

	try {
		console.log("🔵 Creating metadata...")
		const result = await createMetadata(testRequest)

		console.log("✅ Success!")
		console.log(`   Message: ${result.message}`)
		console.log(`   Notarial Registry ID (NRID): ${result.notarialRegistryID}`)
		console.log(`   Notarial Registry Number (NRN): ${result.notarialRegistryNumber}`)
		console.log()
		console.log("💡 You can use this NRID to test:")
		console.log(`   - Principals: pnpm test:supreme-court-principal ${result.notarialRegistryID}`)
		console.log(`   - Witnesses: pnpm test:supreme-court-witness ${result.notarialRegistryID}`)
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

void main()
