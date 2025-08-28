import { type Config } from "drizzle-kit"

import { env } from "@/env"

/**
 * Drizzle Kit configuration following best practices
 * @see https://orm.drizzle.team/docs/kit-overview
 */
const config: Config = {
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

	// Migration configuration
	breakpoints: env.NODE_ENV === "development",
}

export default config
