import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

export const env = createEnv({
	server: {
		AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
		AUTH_URL: z.string().optional(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		PORT: process.env.PORT ? z.coerce.number() : z.coerce.number().default(3000),
	},
	client: {},
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_URL: process.env.AUTH_URL,
		NODE_ENV: process.env.NODE_ENV,
		PORT: process.env.PORT,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
})
