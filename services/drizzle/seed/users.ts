import { faker } from "@faker-js/faker"
import { hash } from "bcryptjs"
import { seed } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { generateTestIds, SEED_CONFIG } from "@/services/drizzle/seed/config"

export async function createUsers() {
	const hashedPassword = await hash(SEED_CONFIG.defaultPassword, 10)

	const testAccountIds = generateTestIds(SEED_CONFIG.testAccounts.length, "test")
	const testAccountData = SEED_CONFIG.testAccounts.map((account, i) => ({
		id: testAccountIds[i],
		email: account.email,
		name: account.name,
		emailVerified: account.emailVerified,
		image: account.image,
		password: hashedPassword,
	}))

	if (testAccountData.length > 0) {
		await db.insert(users).values(testAccountData)
	}

	// Create random seeded users
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
					password: funcs.default({ defaultValue: hashedPassword }),
				},
			},
		}))
	}
}
