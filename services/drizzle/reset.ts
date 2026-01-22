import "dotenv/config"

import { db } from "@/services/drizzle/db"

async function main() {
	// Local/dev reset: drop and recreate the public schema so enums/types don't linger.
	// This makes `drizzle-kit migrate` idempotent for local environments.
	await db.$client`drop schema if exists public cascade;`
	await db.$client`create schema public;`
	await db.$client`grant all on schema public to public;`
	await db.$client`grant all on schema public to postgres;`
	await db.$client.end()
}

void main()
