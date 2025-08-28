/* eslint-disable no-console */
import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { createUsers } from "@/services/drizzle/seed/users"

async function main() {
	console.log("🌱 Starting database seed...")

	try {
		// Test database connection first
		console.log("🔗 Testing database connection...")
		await db.$client.query("SELECT 1")
		console.log("✅ Database connection successful")

		await createUsers()
		console.log("✅ Database seed completed successfully!")
	} catch (error) {
		console.error("❌ Seed failed:", error)

		// Provide more helpful error messages
		if (error instanceof Error) {
			if (error.message.includes("ECONNREFUSED")) {
				console.error("💡 Make sure your database is running and connection details are correct")
			} else if (error.message.includes("duplicate key")) {
				console.error("💡 Database contains conflicting data. Try running db:reset first")
			} else if (error.message.includes("permission denied")) {
				console.error("💡 Check database permissions and credentials")
			}
		}

		process.exit(1)
	} finally {
		try {
			await db.$client.end()
			console.log("🔌 Database connection closed")
		} catch (error) {
			console.warn("⚠️ Failed to close database connection:", error)
		}
	}
}

void main()
