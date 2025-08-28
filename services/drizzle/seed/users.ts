import { faker } from "@faker-js/faker"
import { seed } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { generateTestIds, SEED_CONFIG } from "@/services/drizzle/seed/config"

export async function createUsers() {
	// First, create the specific test accounts
	const testAccountIds = generateTestIds(SEED_CONFIG.testAccounts.length, "test")

	for (let i = 0; i < SEED_CONFIG.testAccounts.length; i++) {
		const account = SEED_CONFIG.testAccounts[i]
		await db.insert(users).values({
			id: testAccountIds[i],
			email: account?.email,
			name: account?.name,
			emailVerified: account?.emailVerified.toISOString(),
			image: account?.image,
		})
	}

	// Then create random seeded users
	const randomUserCount = SEED_CONFIG.userCount - SEED_CONFIG.testAccounts.length
	if (randomUserCount > 0) {
		const randomTestIds = generateTestIds(randomUserCount, "test")

		await seed(db, { users }, { count: randomUserCount, seed: SEED_CONFIG.seed }).refine(funcs => ({
			users: {
				columns: {
					id: funcs.valuesFromArray({ values: randomTestIds, isUnique: true }),
					email: funcs.email(),
					name: funcs.fullName(),
					emailVerified: funcs.date({
						minDate: "2024-01-01T00:00:00.000Z",
						maxDate: "2024-12-31T23:59:59.999Z",
					}),
					image: funcs.default({ defaultValue: faker.image.avatar() }),
				},
			},
		}))
	}
}
