import { faker } from "@faker-js/faker"
import { hash } from "bcryptjs"
import { inArray } from "drizzle-orm"
import { seed } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
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
		role: account.role,
	}))

	if (testAccountData.length > 0) {
		// Delete existing test accounts by email to avoid conflicts
		const testEmails = testAccountData.map(account => account.email)
		await db.delete(users).where(inArray(users.email, testEmails))

		// Insert test accounts
		await db.insert(users).values(testAccountData)

		// Create ENP profiles for ENP test accounts
		const enpUsers = testAccountData.filter(account => account.role === "ENP")
		console.log(`Creating ENP profiles for ${enpUsers.length} ENP users`)
		
		if (enpUsers.length > 0) {
			const enpProfileData = enpUsers.map(enpUser => ({
				userId: enpUser.id,
				specialization: faker.helpers.arrayElement(["real-estate", "business", "family", "corporate", "international"]),
				bio: faker.lorem.sentence(),
				experience: faker.helpers.arrayElement(["2+ years", "5+ years", "10+ years", "15+ years"]),
				languages: JSON.stringify(["English", "Filipino"]),
				responseTime: faker.helpers.arrayElement(["Within 1 hour", "Within 2 hours", "Within 24 hours"]),
				rating: faker.number.float({ min: 3.5, max: 5.0, precision: 0.1 }),
				reviewCount: faker.number.int({ min: 5, max: 150 }),
				commission: faker.number.float({ min: 0.1, max: 0.3, precision: 0.05 }),
				isAvailable: true,
				enpName: enpUser.name,
				enpRoleNumber: faker.string.alphanumeric(6).toUpperCase(),
				attyName: `ATTY. ${enpUser.name}`,
				rollNo: faker.string.alphanumeric(8).toUpperCase(),
				rollNoDate: "5 June 2018",
				commissionNo: `2024 - ${faker.string.numeric(3)}`,
				commissionNoValidUntil: "Dec 31, 2025",
				ptrNo: faker.string.numeric(8),
				ptrNoLocation: "Manila",
				ptrNoDate: "Jan 02, 2025",
				ibpNo: faker.string.numeric(10),
				ibpNoDate: "Dec 18, 2024 (for 2025)",
				notaryEmail: enpUser.email,
				notaryAddress: faker.location.streetAddress(),
				mcleNoPeriod: "VIII",
				mcleNo: faker.string.numeric(8),
				mcleNoDate: "Jun 12, 2024",
				modeOfNotarization: "REN",
			}))

			const insertedProfiles = await db.insert(enpProfiles).values(enpProfileData).returning()
			console.log(`✅ Successfully created ${insertedProfiles.length} ENP profiles`)
			insertedProfiles.forEach(profile => {
				console.log(`  - ENP Profile: ${profile.enpName} (${profile.specialization}, rating: ${profile.rating})`)
			})
		}
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
					role: funcs.default({ defaultValue: "PRINCIPAL" }),
				},
			},
		}))
	}
}
