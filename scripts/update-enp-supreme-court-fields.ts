/**
 * Helper script to update Supreme Court API fields (NPN and NFN) for an ENP profile.
 * Run: pnpm exec tsx scripts/update-enp-supreme-court-fields.ts <act-id> <npn> <nfn>
 *
 * Example: pnpm exec tsx scripts/update-enp-supreme-court-fields.ts abc123 NPN-123 NFN-456
 */
import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { eq } from "drizzle-orm"

async function main() {
	const actId = process.argv[2]
	const npn = process.argv[3]
	const nfn = process.argv[4]

	if (!actId || !npn || !nfn) {
		console.error("❌ Usage: pnpm update:enp-supreme-court-fields <act-id> <npn> <nfn>")
		console.error("")
		console.error("   Replace placeholders with actual values:")
		console.error("   - <act-id>: The notarial act ID (e.g., a360c764-b553-42df-9b0d-d7f52fe36eee)")
		console.error("   - <npn>: Your Notary Public Number (e.g., NPN-123)")
		console.error("   - <nfn>: Your Notary Facility Number (e.g., NFN-456)")
		console.error("")
		console.error("   Example:")
		console.error("   pnpm update:enp-supreme-court-fields a360c764-b553-42df-9b0d-d7f52fe36eee NPN-123 NFN-456")
		console.error("")
		console.error("   ⚠️  Note: Use REAL credentials from Supreme Court, not test values!")
		process.exit(1)
	}

	console.log("🔵 Updating ENP profile Supreme Court fields...\n")

	try {
		// Get notarial act
		const act = await db.query.notarialActs.findFirst({
			where: eq(notarialActs.id, actId),
		})

		if (!act) {
			console.error(`❌ Notarial act not found: ${actId}`)
			process.exit(1)
		}

		console.log(`✅ Found notarial act: ${act.certificateNumber || act.id}`)

		// Get notarial book
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const notarialBook = await db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.id, act.notarialBookId),
		})

		if (!notarialBook) {
			console.error(`❌ Notarial book not found for act`)
			process.exit(1)
		}

		// Get current ENP profile
		const currentProfile = await db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, notarialBook.enpId),
			columns: {
				userId: true,
				notaryPublicNumber: true,
				notaryFacilityNumber: true,
				rollNo: true,
			},
		})

		if (!currentProfile) {
			console.error(`❌ ENP profile not found for user: ${notarialBook.enpId}`)
			process.exit(1)
		}

		console.log(`✅ Found ENP profile for user: ${notarialBook.enpId}`)
		console.log(`   Current NPN: ${currentProfile.notaryPublicNumber || "MISSING"}`)
		console.log(`   Current NFN: ${currentProfile.notaryFacilityNumber || "MISSING"}`)
		console.log(`   Current RN: ${currentProfile.rollNo || "MISSING"}\n`)

		// Update the profile
		await db
			.update(enpProfiles)
			.set({
				notaryPublicNumber: npn,
				notaryFacilityNumber: nfn,
			})
			.where(eq(enpProfiles.userId, notarialBook.enpId))

		console.log("✅ Updated ENP profile:")
		console.log(`   - Notary Public Number (NPN): ${npn}`)
		console.log(`   - Notary Facility Number (NFN): ${nfn}`)
		console.log(`   - Roll Number (RN): ${currentProfile.rollNo || "MISSING"}\n`)

		console.log("✅ You can now run the sync script:")
		console.log(`   pnpm test:supreme-court-sync ${actId}`)
	} catch (error) {
		console.error("\n❌ Update failed:", error instanceof Error ? error.message : error)
		if (error instanceof Error && error.stack) {
			console.error("\nStack trace:", error.stack)
		}
		process.exit(1)
	}
}

main()
