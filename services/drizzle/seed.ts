import "dotenv/config"

import { db } from "@/services/drizzle/db"
import { createUsers } from "@/services/drizzle/seed/users"

async function main() {
	await createUsers()
	await db.$client.end()
}

void main()
