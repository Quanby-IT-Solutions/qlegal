import "dotenv/config"

import { reset } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import * as schema from "@/services/drizzle/schema"

async function main() {
	await db.$client.query("SELECT 1")
	await reset(db, schema)
	await db.$client.end()
}

void main()
