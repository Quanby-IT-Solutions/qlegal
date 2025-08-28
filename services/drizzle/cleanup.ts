import "dotenv/config"

import { eq, like } from "drizzle-orm"

import { db } from "@/services/drizzle/db"
import * as schema from "@/services/drizzle/schema"

async function cleanupSeededData() {
	await db.$client.query("SELECT 1")

	const seededUsersBefore = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(like(schema.users.id, "test-%"))

	if (seededUsersBefore.length === 0) {
		return
	}

	const seededUserIds = seededUsersBefore.map(user => user.id)

	for (const userId of seededUserIds) {
		await db.delete(schema.authenticators).where(eq(schema.authenticators.userId, userId))
		await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId))
		await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
	}

	await db.delete(schema.users).where(like(schema.users.id, "test-%"))
}

void cleanupSeededData()
