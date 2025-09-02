import { defineConfig } from "drizzle-kit"

import { env } from "@/env"

/**
 * Drizzle Kit configuration following best practices
 * @see https://orm.drizzle.team/docs/kit-overview
 */
export default defineConfig({
	// Schema configuration
	schema: "./services/drizzle/schema/*",
	schemaFilter: ["public"],
	// Output configuration
	out: "./services/drizzle/migrations",
	// Database configuration
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
	// Development and debugging
	verbose: env.NODE_ENV === "development",
	strict: true,
	casing: "snake_case",
	// Migration configuration
	breakpoints: env.NODE_ENV === "development",
})
