/* eslint-disable no-restricted-properties */
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"

import * as schema from "@/services/drizzle/schema"

const createPoolConfig = (): PoolConfig => {
	const baseConfig: PoolConfig = {
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 10000,
		query_timeout: 30000,
		statement_timeout: 30000,
		idle_in_transaction_session_timeout: 30000,
	}

	if (process.env.NODE_ENV === "production") {
		return {
			...baseConfig,
			min: 2,
			max: 20,
			idleTimeoutMillis: 300000,
			allowExitOnIdle: false,
		}
	}

	return {
		...baseConfig,
		min: 1,
		max: 5,
		idleTimeoutMillis: 60000,
		allowExitOnIdle: true,
	}
}

const globalForDb = globalThis as unknown as {
	conn: Pool | undefined
	db: ReturnType<typeof drizzle> | undefined
}
const createConnection = (): Pool => {
	const pool = new Pool(createPoolConfig())

	pool.on("error", (_, _client) => {
		if (process.env.NODE_ENV === "development") {
			process.exit(1)
		}
	})

	return pool
}

const conn = globalForDb.conn ?? createConnection()

export const db =
	globalForDb.db ??
	drizzle(conn, {
		schema,
		logger: process.env.NODE_ENV === "development",
	})

if (process.env.NODE_ENV !== "production") {
	globalForDb.conn = conn
	globalForDb.db = db
}
