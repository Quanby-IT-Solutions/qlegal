import "dotenv/config"

import { eq, inArray } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { createNotarialActs } from "@/services/drizzle/seed/notarial-acts"
import { createUsers } from "@/services/drizzle/seed/users"

async function cleanupNotarialData() {
	console.log("🧹 Cleaning up existing notarial data...")

	// Get test user emails
	const testEmails = [
		"principal@quanby.com",
		"enp@quanby.com",
		"ena@quanby.com",
		"admin@quanby.com",
	]

	// Find test users
	const testUsers = await db.query.users.findMany({
		where: inArray(users.email, testEmails),
	})

	// Find ENP user
	const enpUser = testUsers.find(u => u.email === "enp@quanby.com")

	if (enpUser) {
		// Find notarial books for this ENP
		const books = await db.query.notarialBooks.findMany({
			where: eq(notarialBooks.enpId, enpUser.id),
		})

		// Delete notarial acts for each book
		for (const book of books) {
			await db.delete(notarialActs).where(eq(notarialActs.notarialBookId, book.id))
		}

		// Delete notarial books
		if (books.length > 0) {
			await db.delete(notarialBooks).where(eq(notarialBooks.enpId, enpUser.id))
			console.log(`✅ Cleaned up ${books.length} notarial book(s) and related acts`)
		}
	}
}

async function main() {
	console.log("🌱 Starting database seed...")
	// Clean up notarial data first (before deleting users)
	await cleanupNotarialData()
	// Create users (this will delete and recreate test users)
	await createUsers()
	// Then create notarial acts (which depend on users)
	await createNotarialActs()
	console.log("✅ Database seed completed!")
	await db.$client.end()
}

void main()
