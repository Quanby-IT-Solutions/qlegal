import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { createNotarialActs } from "@/services/drizzle/seed/notarial-acts"
import { createUsers } from "@/services/drizzle/seed/users"

async function cleanupNotarialData() {
	console.log("🧹 Cleaning up existing notarial data...")

	// Intentionally clear all notarial data so createUsers() can delete any users (including non-test ENPs)
	// eslint-disable-next-line drizzle/enforce-delete-with-where -- seed cleanup
	await db.delete(notarialActs)
	// eslint-disable-next-line drizzle/enforce-delete-with-where -- seed cleanup
	await db.delete(notarialBooks)

	console.log("✅ Cleaned up all notarial acts and notarial books")
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
