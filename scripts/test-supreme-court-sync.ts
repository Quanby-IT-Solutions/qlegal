/**
 * Test script for Supreme Court notarial act sync.
 * Run: pnpm exec tsx scripts/test-supreme-court-sync.ts <notarial-act-id>
 *
 * Requires:
 * - .env with Supreme Court credentials
 * - A notarial act ID from your database
 * - ENP profile with notaryPublicNumber, notaryFacilityNumber, and rollNo set
 */
import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { documents } from "@/services/drizzle/schema/document"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { users } from "@/services/drizzle/schema/auth"
import { syncNotarialActToSupremeCourt } from "@/services/supreme-court/lib/sync-notarial-act"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"
import { getServiceRoleClient } from "@/services/supabase"
import { eq } from "drizzle-orm"

async function main() {
	const actId = process.argv[2]

	if (!actId) {
		console.error("❌ Usage: pnpm exec tsx scripts/test-supreme-court-sync.ts <notarial-act-id>")
		console.error("   Example: pnpm exec tsx scripts/test-supreme-court-sync.ts abc123")
		process.exit(1)
	}

	console.log("🔵 Testing Supreme Court Notarial Act Sync...\n")

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env:")
		console.error("   SUPREME_COURT_API_URL, SUPREME_COURT_COGNITO_URL,")
		console.error("   SUPREME_COURT_CLIENT_ID, SUPREME_COURT_USERNAME, SUPREME_COURT_PASSWORD")
		process.exit(1)
	}

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
		console.log(`   - Principal: ${act.principalName}`)
		console.log(`   - Act Type: ${act.actType}`)
		console.log(`   - Executed: ${act.executedAt?.toISOString()}`)
		console.log(`   - Already synced: ${act.syncedToSupremeCourt ? "Yes" : "No"}\n`)

		// Get ENP profile
		// @ts-ignore - PostgresJsDatabase<any> doesn't provide proper types for query builder
		 
		const notarialBook = await db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.id, act.notarialBookId),
		})

		if (!notarialBook) {
			console.error(`❌ Notarial book not found for act`)
			process.exit(1)
		}

		// Get user info for debugging
		const enpUser = await db.query.users.findFirst({
			where: eq(users.id, notarialBook.enpId),
			columns: {
				id: true,
				email: true,
				name: true,
			},
		})

		const enpProfile = await db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, notarialBook.enpId),
			columns: {
				userId: true,
				notaryPublicNumber: true,
				notaryFacilityNumber: true,
				rollNo: true,
			},
		})

		if (!enpProfile) {
			console.error(`❌ ENP profile not found for user: ${notarialBook.enpId}`)
			if (enpUser) {
				console.error(`   User: ${enpUser.name || enpUser.email || enpUser.id}`)
			}
			process.exit(1)
		}

		console.log(`📋 Checking ENP profile for:`)
		console.log(`   - User ID: ${notarialBook.enpId}`)
		if (enpUser) {
			console.log(`   - Name: ${enpUser.name || "—"}`)
			console.log(`   - Email: ${enpUser.email || "—"}`)
		}
		console.log()

		if (!enpProfile.notaryPublicNumber || !enpProfile.notaryFacilityNumber || !enpProfile.rollNo) {
			console.error("❌ ENP profile missing required fields:")
			console.error(`   - Notary Public Number (NPN): ${enpProfile.notaryPublicNumber || "MISSING"}`)
			console.error(`   - Notary Facility Number (NFN): ${enpProfile.notaryFacilityNumber || "MISSING"}`)
			console.error(`   - Roll Number (RN): ${enpProfile.rollNo || "MISSING"}`)
			console.error("\n   Please update ENP profile settings with these values.")
			if (enpUser) {
				console.error(`\n   ⚠️  Make sure you're logged in as: ${enpUser.email || enpUser.name || enpUser.id}`)
				console.error(`   The form saves to the currently logged-in user's profile.`)
			}
			process.exit(1)
		}

		console.log("✅ ENP profile found:")
		console.log(`   - NPN: ${enpProfile.notaryPublicNumber}`)
		console.log(`   - NFN: ${enpProfile.notaryFacilityNumber}`)
		console.log(`   - RN: ${enpProfile.rollNo}\n`)

		// Download document if available
		let documentFile: Buffer | undefined
		let documentFileName: string | undefined

		if (act.documentId) {
			// @ts-ignore - PostgresJsDatabase<any> doesn't provide proper types for query builder
			 
			const document = await db.query.documents.findFirst({
				where: eq(documents.id, act.documentId),
				columns: { path: true, name: true },
			})

			if (document?.path) {
				console.log(`🔵 Downloading document: ${document.name || document.path}...`)
				const supabase = getServiceRoleClient()
				const { data: fileData, error: downloadError } = await supabase.storage
					.from("documents")
					.download(document.path)

				if (!downloadError && fileData) {
					const arrayBuffer = await fileData.arrayBuffer()
					documentFile = Buffer.from(arrayBuffer)
					documentFileName = document.name || "document.pdf"
					console.log(`✅ Document downloaded: ${documentFileName} (${documentFile.length} bytes)\n`)
				} else {
					console.warn(`⚠️ Could not download document: ${downloadError?.message}\n`)
				}
			}
		}

		// Sync to Supreme Court
		console.log("🔵 Syncing to Supreme Court...\n")
		const result = await syncNotarialActToSupremeCourt({
			act,
			notaryFacilityNumber: enpProfile.notaryFacilityNumber,
			notaryPublicNumber: enpProfile.notaryPublicNumber,
			rollNumber: enpProfile.rollNo,
			documentFile,
			documentFileName,
		})

		// Save NRID to the act so it shows in the notarial registry
		await db
			.update(notarialActs)
			.set({
				syncedToSupremeCourt: true,
				syncedAt: new Date(),
				supremeCourtRegistryId: result.notarialRegistryID,
			})
			.where(eq(notarialActs.id, actId))

		console.log("\n✅ Sync successful!")
		console.log(`   - Notarial Registry ID (NRID): ${result.notarialRegistryID}`)
		console.log(`   - Notarial Registry Number (NRN): ${result.notarialRegistryNumber}`)
	} catch (error) {
		console.error("\n❌ Sync failed:", error instanceof Error ? error.message : error)
		if (error instanceof Error && error.stack) {
			console.error("\nStack trace:", error.stack)
		}
		process.exit(1)
	}
}

main()
