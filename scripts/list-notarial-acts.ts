/**
 * Helper script to list notarial acts for testing.
 * Run: pnpm exec tsx scripts/list-notarial-acts.ts
 */
import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { users } from "@/services/drizzle/schema/auth"
import { desc, eq } from "drizzle-orm"

async function main() {
	console.log("🔵 Listing notarial acts...\n")

	const acts = await db
		.select({
			id: notarialActs.id,
			certificateNumber: notarialActs.certificateNumber,
			principalName: notarialActs.principalName,
			actType: notarialActs.actType,
			executedAt: notarialActs.executedAt,
			syncedToSupremeCourt: notarialActs.syncedToSupremeCourt,
			enpName: notarialActs.enpName,
			enpId: notarialBooks.enpId,
			userEmail: users.email,
			userName: users.name,
		})
		.from(notarialActs)
		.innerJoin(notarialBooks, eq(notarialActs.notarialBookId, notarialBooks.id))
		.leftJoin(users, eq(notarialBooks.enpId, users.id))
		.orderBy(desc(notarialActs.executedAt))
		.limit(20)

	if (acts.length === 0) {
		console.log("❌ No notarial acts found in database.")
		console.log("   Create a notarial act by completing a notarization session first.")
		process.exit(0)
	}

	console.log(`✅ Found ${acts.length} notarial act(s):\n`)
	console.log("ID".padEnd(40) + " | Certificate # | Principal | Act Type | ENP | Synced")
	console.log("-".repeat(120))

	acts.forEach(act => {
		const id = act.id.substring(0, 38).padEnd(40)
		const cert = (act.certificateNumber || "—").padEnd(14)
		const principal = (act.principalName || "—").substring(0, 20).padEnd(20)
		const actType = (act.actType || "—").padEnd(20)
		const enp = (act.enpName || act.userName || act.userEmail || "—").substring(0, 20).padEnd(20)
		const synced = act.syncedToSupremeCourt ? "Yes" : "No"
		console.log(`${id} | ${cert} | ${principal} | ${actType} | ${enp} | ${synced}`)
	})

	console.log("\n💡 To test sync, run:")
	console.log(`   pnpm test:supreme-court-sync <act-id>`)
	console.log(`   Example: pnpm test:supreme-court-sync ${acts[0]?.id}`)
}

main()
