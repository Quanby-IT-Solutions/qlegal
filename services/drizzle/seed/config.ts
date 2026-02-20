import { randomUUID } from "crypto"
import { faker } from "@faker-js/faker"

import type { UserRole } from "@/services/drizzle/schema/auth"

import { env } from "@/env"

interface TestAccount {
	email: string
	name: string
	emailVerified: Date
	image: string
	role: UserRole
}

export const FIXED_TEST_ENPS = [
	{
		email: "abdinsa.s.sultan.enp@maildrop.cc",
		name: "ABDINSA S. SULTAN",
		notaryPublicNumber: "NPN-2026-00011",
		rollNo: "57793",
	},
	{
		email: "abdol.bryan.l.barte.enp@maildrop.cc",
		name: "ABDOL BRYAN L. BARTE",
		notaryPublicNumber: "NPN-2026-00012",
		rollNo: "69750",
	},
	{
		email: "abdua.s.jula.enp@maildrop.cc",
		name: "ABDUA S. JULA",
		notaryPublicNumber: "NPN-2026-00013",
		rollNo: "29395",
	},
] as const

const fixedTestEnpAccounts = FIXED_TEST_ENPS.map(enp => ({
	email: enp.email,
	name: enp.name,
	emailVerified: new Date(Date.now()),
	image: faker.image.avatar(),
	role: "ENP" as const,
}))

export const SEED_CONFIG = {
	seed: env.SEED_VALUE ?? 12345,
	userCount: 10,
	defaultPassword: "asdfasdf",
	testAccounts: [
		{
			email: "principal@maildrop.cc",
			name: "Principal User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "PRINCIPAL" as const,
		},
		{
			email: "enp@maildrop.cc",
			name: "ENP User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "ENP" as const,
		},
		...fixedTestEnpAccounts,
		{
			email: "ena@maildrop.cc",
			name: "ENA User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "ENA" as const,
		},
		{
			email: "admin@maildrop.cc",
			name: "Admin User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "ADMIN" as const,
		},
	] satisfies TestAccount[],
} as const

export function generateTestIds(count: number, prefix = "test"): string[] {
	return Array.from({ length: count }, () => `${prefix}-${randomUUID()}`)
}
