import { randomUUID } from "crypto"
import { faker } from "@faker-js/faker"

export const SEED_CONFIG = {
	seed: 12345,
	userCount: 25,
	defaultPassword: "asdfasdf",
	testAccounts: [
		{
			email: "client@quanby.com",
			name: "Sarah Johnson",
			emailVerified: new Date("2024-01-15T10:30:00.000Z"),
			image: faker.image.avatar(),
		},
		{
			email: "john@quanby.com",
			name: "John Smith",
			emailVerified: new Date("2024-02-20T14:15:00.000Z"),
			image: faker.image.avatar(),
		},
		{
			email: "admin@quanby.com",
			name: "Michael Chen",
			emailVerified: new Date("2024-03-10T08:45:00.000Z"),
			image: faker.image.avatar(),
		},
		{
			email: "superadmin@quanby.com",
			name: "Emily Davis",
			emailVerified: new Date("2024-04-05T16:20:00.000Z"),
			image: faker.image.avatar(),
		},
	],
} as const

export function generateTestIds(count: number, prefix = "test"): string[] {
	return Array.from({ length: count }, () => `${prefix}-${randomUUID()}`)
}
