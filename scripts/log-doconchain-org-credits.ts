/**
 * Call DocOnChain GET /api/v2/organizations/credits and log the full response.
 * Use this to inspect main org and sub-org credits from the API.
 *
 * Run: pnpm run log:doconchain-credits
 * Or:  cross-env SKIP_ENV_VALIDATION=1 tsx scripts/log-doconchain-org-credits.ts
 */
import "dotenv/config"

import { getDoconchainOrganizationCredits } from "@/services/doconchain/organization/get-organization-credits"

async function main() {
	console.log("Calling DocOnChain GET /api/v2/organizations/credits...\n")

	const result = await getDoconchainOrganizationCredits()

	console.log("--- Summary ---")
	console.log(JSON.stringify(result.summary, null, 2))
	console.log("\n--- Items (parsed rows) ---")
	console.log(JSON.stringify(result.items, null, 2))
	console.log("\n--- Raw API response ---")
	console.log(JSON.stringify(result.raw, null, 2))

	// If the API returns sub_organizations in each item, show them
	const withSubOrgs = result.items.filter(
		row =>
			row &&
			typeof row === "object" &&
			"sub_organizations" in row &&
			Array.isArray((row as { sub_organizations?: unknown }).sub_organizations)
	)
	if (withSubOrgs.length > 0) {
		console.log("\n--- Items with sub_organizations ---")
		withSubOrgs.forEach((row, i) => {
			const sub = (row as { name?: string; sub_organizations?: unknown[] }).sub_organizations ?? []
			console.log(
				`[${i}] ${(row as { name?: string }).name ?? row.uuid ?? "?"}: ${sub.length} sub_org(s)`
			)
			console.log(JSON.stringify(sub, null, 2))
		})
	}

	console.log("\nDone.")
}

main().catch(err => {
	console.error("Error:", err)
	process.exit(1)
})
