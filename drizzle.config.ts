import { defineConfig } from "drizzle-kit"

import { env } from "@/env"

/**
 * Drizzle Kit configuration following best practices
 * @see https://orm.drizzle.team/docs/kit-overview
 */
export default defineConfig({
	schema: "./services/drizzle/schema/*",
	schemaFilter: ["public"],
	out: "./services/drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
	verbose: env.NODE_ENV === "development",
	strict: true,
	casing: "camelCase",
	breakpoints: env.NODE_ENV === "development",
})
