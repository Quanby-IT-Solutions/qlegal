import { generateAvatar } from "@/services/drizzle/seed/utils"

/**
 * Test accounts with predefined data for development
 */
export const TEST_ACCOUNTS = [
	{
		email: "client@quanby.com",
		name: "Sarah Johnson",
		emailVerified: new Date(),
		image: generateAvatar(),
	},
	{
		email: "john@quanby.com",
		name: "John Smith",
		emailVerified: new Date(),
		image: generateAvatar(),
	},
	{
		email: "admin@quanby.com",
		name: "Michael Chen",
		emailVerified: new Date(),
		image: generateAvatar(),
	},
	{
		email: "superadmin@quanby.com",
		name: "Emily Davis",
		emailVerified: new Date(),
		image: generateAvatar(),
	},
] as const

/**
 * Number of users to seed
 */
export const USER_COUNT = 25
