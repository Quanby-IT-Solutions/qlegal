/* eslint-disable no-console */
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"

import * as schema from "@/services/drizzle/schema"

import { env } from "@/env"

/**
 * Database connection configuration following Drizzle best practices
 * @see https://orm.drizzle.team/docs/get-started-postgresql
 */
const createPoolConfig = (): PoolConfig => {
	const baseConfig: PoolConfig = {
		connectionString: env.DATABASE_URL,
		// Connection timeout settings
		connectionTimeoutMillis: 10000, // 10 seconds
		query_timeout: 30000, // 30 seconds
		statement_timeout: 30000, // 30 seconds
		idle_in_transaction_session_timeout: 30000, // 30 seconds
	}

	// Production-specific optimizations
	if (env.NODE_ENV === "production") {
		return {
			...baseConfig,
			// Connection pool settings for production
			min: 2,
			max: 20,
			idleTimeoutMillis: 300000, // 5 minutes
			allowExitOnIdle: false,
		}
	}

	// Development-specific settings
	return {
		...baseConfig,
		// Smaller pool for development
		min: 1,
		max: 5,
		idleTimeoutMillis: 60000, // 1 minute
		allowExitOnIdle: true,
	}
}

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update and improves development experience.
 */
const globalForDb = globalThis as unknown as {
	conn: Pool | undefined
	db: ReturnType<typeof drizzle> | undefined
}

/**
 * Create and configure the database connection pool
 */
const createConnection = (): Pool => {
	const pool = new Pool(createPoolConfig())

	// Add event listeners for connection monitoring
	pool.on("connect", _client => {
		if (env.NODE_ENV === "development") {
			console.log("🔌 New database client connected")
		}
	})

	pool.on("error", (err, _client) => {
		console.error("❌ Unexpected error on idle client:", err)
		// Don't exit the process in production, just log the error
		if (env.NODE_ENV === "development") {
			process.exit(1)
		}
	})

	pool.on("remove", _client => {
		if (env.NODE_ENV === "development") {
			console.log("🔌 Database client removed from pool")
		}
	})

	return pool
}

/**
 * Initialize the database connection
 */
const conn = globalForDb.conn ?? createConnection()

/**
 * Create the Drizzle instance with proper configuration
 */
export const db =
	globalForDb.db ??
	drizzle(conn, {
		schema,
		logger: env.NODE_ENV === "development",
	})

/**
 * Cache connections in development to avoid HMR issues
 */
if (env.NODE_ENV !== "production") {
	globalForDb.conn = conn
	globalForDb.db = db
}

/**
 * Graceful shutdown handler for database connections
 */
export const closeDatabase = async (): Promise<void> => {
	try {
		await conn.end()
		console.log("✅ Database connection closed successfully")
	} catch (error) {
		console.error("❌ Error closing database connection:", error)
	}
}

/**
 * Health check function to verify database connectivity
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
	try {
		await conn.query("SELECT 1")
		return true
	} catch (error) {
		console.error("❌ Database health check failed:", error)
		return false
	}
}

// Handle process termination gracefully
if (typeof process !== "undefined") {
	process.on("SIGINT", () => {
		console.log("\n⚠️  Received SIGINT, closing database connection...")
		closeDatabase()
			.then(() => process.exit(0))
			.catch(() => process.exit(1))
	})

	process.on("SIGTERM", () => {
		console.log("\n⚠️  Received SIGTERM, closing database connection...")
		closeDatabase()
			.then(() => process.exit(0))
			.catch(() => process.exit(1))
	})
}
