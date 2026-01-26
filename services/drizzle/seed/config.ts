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

export const SEED_CONFIG = {
	seed: env.SEED_VALUE ?? 12345,
	userCount: 10,
	defaultPassword: "asdfasdf",
	testAccounts: [
		{
			email: "principal@quanby.com",
			name: "Principal User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "PRINCIPAL" as const,
		},
		{
			email: "enp@quanby.com",
			name: "ENP User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "ENP" as const,
		},
		{
			email: "ena@quanby.com",
			name: "ENA User",
			emailVerified: new Date(Date.now()),
			image: faker.image.avatar(),
			role: "ENA" as const,
		},
		{
			email: "admin@quanby.com",
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
