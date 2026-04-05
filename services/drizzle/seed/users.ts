import { table } from "console"
import { faker } from "@faker-js/faker"
import { hash } from "bcryptjs"
import { inArray, not } from "drizzle-orm"
import { seed } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { FIXED_TEST_ENPS, generateTestIds, SEED_CONFIG } from "@/services/drizzle/seed/config"

export async function createUsers() {
	const hashedPassword = await hash(SEED_CONFIG.defaultPassword, 10)

	// Create test accounts
	const testAccountIds = generateTestIds(SEED_CONFIG.testAccounts.length, "test")
	function splitName(fullName: string) {
		const parts = fullName.trim().split(/\s+/)
		if (parts.length === 1) return { firstName: parts[0] ?? "", middleName: "", lastName: "" }
		return {
			firstName: parts[0] ?? "",
			middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
			lastName: parts[parts.length - 1] ?? "",
		}
	}

	const testAccountData = SEED_CONFIG.testAccounts.map((account, i) => {
		const { firstName, middleName, lastName } = splitName(account.name)
		return {
			id: testAccountIds[i],
			email: account.email,
			firstName,
			middleName: middleName || null,
			lastName,
			emailVerified: account.emailVerified,
			image: account.image,
			password: hashedPassword,
			role: account.role,
			commissionStatus: (account.role === "ENP" ? "PENDING" : "ACTIVE") as "ACTIVE" | "PENDING" | "SUSPENDED",
			kycStatus: "VERIFIED" as const,
			kycVerifiedAt: new Date(),
		}
	})

	let insertedTestUsers: Array<{
		id: string
		email: string | null
		firstName: string | null
		middleName: string | null
		lastName: string | null
		role: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"
	}> = []

	if (testAccountData.length > 0) {
		// Delete existing test accounts by email to avoid conflicts
		const testEmails = testAccountData.map(account => account.email)
		await db.delete(users).where(inArray(users.email, testEmails))

		// Insert test accounts
		insertedTestUsers = await db.insert(users).values(testAccountData).returning()

		// Update all test accounts to have verified KYC status
		if (insertedTestUsers.length > 0) {
			const testUserIds = insertedTestUsers
				.map(user => user.id)
				.filter((id): id is string => id !== undefined)
			if (testUserIds.length > 0) {
				await db
					.update(users)
					.set({
						kycStatus: "VERIFIED",
						kycVerifiedAt: new Date(),
					})
					.where(inArray(users.id, testUserIds))
				console.log(`✅ Set KYC status to VERIFIED for ${testUserIds.length} test account(s)`)
			}
		}

		// Create ENP profiles for ENP test accounts (silently)
		const enpUsers = insertedTestUsers.filter(account => account.role === "ENP")
		const fixedEnpProfileByEmail = new Map(
			FIXED_TEST_ENPS.map(enp => [
				enp.email.toLowerCase(),
				{
					notaryPublicNumber: enp.notaryPublicNumber,
					rollNo: enp.rollNo,
				},
			])
		)

		if (enpUsers.length > 0) {
			const enpProfileData = enpUsers
				.filter((enpUser): enpUser is typeof enpUser & { id: string } => enpUser.id !== undefined)
				.map(enpUser => {
					const normalizedEmail = (enpUser.email ?? "").trim().toLowerCase()
					const fixedProfile = fixedEnpProfileByEmail.get(normalizedEmail)

					return {
						userId: enpUser.id,
						specialization: faker.helpers.arrayElement([
							"real-estate",
							"business",
							"family",
							"corporate",
							"international",
						]),
						bio: faker.lorem.sentence(),
						experience: faker.helpers.arrayElement([
							"2+ years",
							"5+ years",
							"10+ years",
							"15+ years",
						]),
						languages: JSON.stringify(["English", "Filipino"]),
						responseTime: faker.helpers.arrayElement([
							"Within 1 hour",
							"Within 2 hours",
							"Within 24 hours",
						]),
						rating: faker.number.float({ min: 3.5, max: 5.0 }),
						reviewCount: faker.number.int({ min: 5, max: 150 }),
						commission: faker.number.float({ min: 0.1, max: 0.3 }),
						isAvailable: true,
						notaryPublicNumber:
							fixedProfile?.notaryPublicNumber ??
							`NPN-2026-${faker.string.numeric({ length: 5, allowLeadingZeros: true })}`,
						rollNo: fixedProfile?.rollNo ?? faker.string.alphanumeric(8).toUpperCase(),
						rollNoDate: "5 June 2018",
						commissionNo: `2024 - ${faker.string.numeric(3)}`,
						commissionNoValidUntil: "Dec 31, 2025",
						ptrNo: faker.string.numeric(8),
						ptrNoLocation: "Manila",
						ptrNoDate: "Jan 02, 2025",
						ibpNo: faker.string.numeric(10),
						ibpNoDate: "Dec 18, 2024 (for 2025)",
						notaryAddress: faker.location.streetAddress(),
						mcleNoPeriod: "VIII",
						mcleNo: faker.string.numeric(8),
						mcleNoDate: "Jun 12, 2024",
					}
				})

			await db.insert(enpProfiles).values(enpProfileData)
		}
	}

	// Create random seeded users
	let insertedRandomUsers: Array<{
		id: string
		email: string | null
		name: string | null
		role: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"
	}> = []
	const randomUserCount = SEED_CONFIG.userCount - SEED_CONFIG.testAccounts.length

	if (randomUserCount > 0) {
		// Delete all existing users except test accounts to avoid duplicate emails
		const testEmails = SEED_CONFIG.testAccounts.map(account => account.email)
		await db.delete(users).where(not(inArray(users.email, testEmails)))

		const randomTestIds = generateTestIds(randomUserCount, "test")

		await seed(db, { users }, { count: randomUserCount, seed: SEED_CONFIG.seed }).refine(funcs => ({
			users: {
				columns: {
					id: funcs.valuesFromArray({ values: randomTestIds, isUnique: true }),
					email: funcs.email(),
					firstName: funcs.default({ defaultValue: faker.person.firstName() }),
					middleName: funcs.default({ defaultValue: faker.person.middleName() }),
					lastName: funcs.default({ defaultValue: faker.person.lastName() }),
					emailVerified: funcs.date({
						minDate: "2024-01-01T00:00:00.000Z",
						maxDate: "2024-12-31T23:59:59.999Z",
					}),
					image: funcs.default({ defaultValue: faker.image.avatar() }),
					password: funcs.default({ defaultValue: hashedPassword }),
					role: funcs.default({ defaultValue: "PRINCIPAL" }),
					status: funcs.valuesFromArray({
						values: ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING"],
					}),
				},
			},
		}))

		// Fetch the newly created random users
		insertedRandomUsers = await db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				middleName: users.middleName,
				lastName: users.lastName,
				role: users.role,
			})
			.from(users)
			.where(inArray(users.id, randomTestIds))
	}

	// Display seed statistics
	const allUsers = [...insertedTestUsers, ...insertedRandomUsers]
	const totalUsers = allUsers.length
	const roleCounts = allUsers.reduce(
		(acc, user) => {
			acc[user.role] = (acc[user.role] ?? 0) + 1
			return acc
		},
		{} as Record<string, number>
	)

	console.log("\n📊 Seed Statistics")
	console.log("=".repeat(60))
	console.log(`Seed Value:         ${SEED_CONFIG.seed}`)
	console.log(`Total Users:        ${totalUsers}`)
	console.log(`  Test Accounts:    ${insertedTestUsers.length}`)
	console.log(`  Random Users:     ${insertedRandomUsers.length}`)
	console.log(`\nUsers by Role:`)
	Object.entries(roleCounts).forEach(([role, count]) => {
		console.log(`  ${role.padEnd(12)} ${count}`)
	})
	console.log("=".repeat(60))

	// Display user table
	if (allUsers.length > 0) {
		console.log("\n👥 Generated Users")
		console.log("=".repeat(100))
		table([
			["Name", "Email", "Role"],
			...allUsers.map(u => [
				[u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ") || "—",
				u.email,
				u.role,
			]),
		])
		console.log("=".repeat(100))
	}
}
