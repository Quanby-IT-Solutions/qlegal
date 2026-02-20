/**
 * Test script for Supreme Court Create Metadata (Consolidated) API.
 * Matches the request body from API System Integration Document v1.4, Section 6.
 *
 * Run: pnpm test:supreme-court-consolidated
 *
 * Uses real NPN/NFN/RN so the API accepts (doc example NFN-101/NPN-101/RN-101 are rejected).
 */
import "dotenv/config"

import { createMetadataConsolidated } from "@/services/supreme-court/api/metadata"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	console.log("🔵 Testing Supreme Court Create Metadata (Consolidated) API...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_AUTH_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

	// Request body from API doc Section 6, with real NPN/NFN/RN (doc uses NFN-101 etc. which get rejected)
	const request = {
		notaryFacilityNumber: "NFN-2025-00017",
		notaryPublicNumber: "NPN-2025-00019",
		rollNumber: "RN-12341",
		metaData: {
			dateNotarized: "2025-06-10",
			notarialActType: "Acknowledgment" as const,
			notarialPageNumber: 1,
			notarialBookNumber: 1,
			description: "Test document",
			modeOfNotarization: "In-person" as const,
			remarks: "Sample",
			dateUpdated: "2025-06-09",
		},
		listOfPrincipals: [
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
		],
		listOfWitness: [
			{
				witnessName: "John Doe",
				witnessAddress: {
					homeStreet: "Tala",
					barangay: "188",
					cityProvince: "Caloocan City",
				},
			},
			{
				witnessName: "Jane Doe",
				witnessAddress: {
					homeStreet: "Tala",
					barangay: "188",
					cityProvince: "Caloocan City",
				},
			},
		],
	}

	console.log("📋 Request (POST /public-use/consolidated):")
	console.log(`   NFN: ${request.notaryFacilityNumber}`)
	console.log(`   NPN: ${request.notaryPublicNumber}`)
	console.log(`   RN: ${request.rollNumber}`)
	console.log(`   Principals: ${request.listOfPrincipals.length}`)
	console.log(`   Witnesses: ${request.listOfWitness.length}`)
	console.log()

	try {
		console.log("🔵 Sending consolidated request...")
		const result = await createMetadataConsolidated(request)

		console.log("✅ Success!")
		console.log(`   Message: ${result.message}`)
		console.log(`   Notarial Registry ID (NRID): ${result.notarialRegistryID}`)
		console.log(`   Notarial Registry Number (NRN): ${result.notarialRegistryNumber}`)
	} catch (error) {
		console.error("❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

main()
