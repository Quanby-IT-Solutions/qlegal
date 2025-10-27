import "dotenv/config"

import { reset } from "drizzle-seed"

import { db } from "@/services/drizzle/db"
import { schema } from "@/services/drizzle/schema"

async function main() {
	await reset(db, schema)
	await db.$client.end()
}

void main()
