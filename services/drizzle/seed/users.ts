/* eslint-disable no-console */
import { faker } from "@faker-js/faker"
import { seed } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { TEST_ACCOUNTS, USER_COUNT } from "@/services/drizzle/seed/config"

/**
 * Clear all existing users from the database
 */
async function clearUsers() {
	try {
		console.log("🧹 Clearing existing users...")
		// eslint-disable-next-line drizzle/enforce-delete-with-where
		await db.delete(users)
		console.log("✅ Cleared existing users")
	} catch (error) {
		console.error("❌ Error clearing users:", error)
		throw error
	}
}

/**
 * Create users following Drizzle best practices
 */
export async function createUsers() {
	const seedValue = 12345 // Fixed seed for deterministic results

	try {
		console.log("🌱 Starting user seeding...")

		// Clear existing data first
		await clearUsers()

		// Create test accounts first with consistent IDs
		console.log("Creating test accounts...")
		const testAccountsWithIds = TEST_ACCOUNTS.map((account, index) => ({
			...account,
			// Use consistent IDs based on email to avoid conflicts
			id: `test-${index + 1}-${account.email.split("@")[0]}`,
		}))

		for (const account of testAccountsWithIds) {
			try {
				await db.insert(users).values({
					id: account.id,
					email: account.email,
					name: account.name,
					emailVerified: account.emailVerified,
					image: account.image as string | null,
				})
			} catch (error) {
				console.warn(`⚠️ Failed to create test account ${account.email}:`, error)
				// Continue with other accounts
			}
		}

		console.log(`✅ Created ${TEST_ACCOUNTS.length} test accounts`)

		// Create additional random users using drizzle-seed
		const randomUserCount = USER_COUNT - TEST_ACCOUNTS.length
		console.log(`Creating ${randomUserCount} random users...`)

		if (randomUserCount > 0) {
			// Pre-generate avatar URLs for better performance
			const avatarUrls = Array.from({ length: randomUserCount }, () => faker.image.avatar())

			await seed(db, { users }, { count: randomUserCount, seed: seedValue }).refine(funcs => ({
				users: {
					columns: {
						id: funcs.uuid(),
						name: funcs.fullName(),
						email: funcs.email(),
						emailVerified: funcs.date({
							minDate: "2024-01-01T00:00:00.000Z",
							maxDate: "2024-12-31T23:59:59.999Z",
						}),
						image: funcs.valuesFromArray({
							values: [...avatarUrls, undefined],
						}),
					},
				},
			}))

			console.log(`✅ Created ${randomUserCount} random users`)
		}

		console.log(`🎉 Total users created: ${USER_COUNT}`)
	} catch (error) {
		console.error("❌ Error in createUsers:", error)
		throw error
	}
}
