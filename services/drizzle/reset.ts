/* eslint-disable no-console */
import "dotenv/config"

import { reset } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import * as schema from "@/services/drizzle/schema"

async function main() {
	console.log("🗑️ Starting database reset...")

	try {
		// Test database connection first
		console.log("🔗 Testing database connection...")
		await db.$client.query("SELECT 1")
		console.log("✅ Database connection successful")

		// Reset the database using drizzle-seed
		console.log("🔄 Resetting database...")
		await reset(db, schema)
		console.log("✅ Database reset completed successfully!")
	} catch (error) {
		console.error("❌ Reset failed:", error)

		// Provide more helpful error messages
		if (error instanceof Error) {
			if (error.message.includes("ECONNREFUSED")) {
				console.error("💡 Make sure your database is running and connection details are correct")
			} else if (error.message.includes("permission denied")) {
				console.error("💡 Check database permissions and credentials")
			} else if (error.message.includes("does not exist")) {
				console.error("💡 Database or tables may not exist yet. Try running migrations first")
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
