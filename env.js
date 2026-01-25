import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		// Auth
		AUTH_GOOGLE_ID: z.string(),
		AUTH_GOOGLE_SECRET: z.string(),
		AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
		AUTH_TRUST_HOST: z.string(),
		AUTH_URL: z.string(),

		// Database
		DATABASE_URL: z.string(),

		// DocOnChain
		DOCONCHAIN_API_URL: z.string().url(),
		DOCONCHAIN_APP_URL: z.string().url(),
		DOCONCHAIN_CLIENT_KEY: z.string(),
		DOCONCHAIN_CLIENT_SECRET: z.string(),
		DOCONCHAIN_EMAIL: z.string().email(),
		DOCONCHAIN_ORG_INVITE_CODE: z.string(),
		DOCONCHAIN_ORGANIZATION_ID: z.string(),

		// Email
		EMAIL_FROM_NAME: z.string(),
		EMAIL_FROM: z.string(),
		EMAIL_HOST: z.string(),
		EMAIL_PASS: z.string(),
		EMAIL_PORT: z.coerce.number(),
		EMAIL_USER: z.string(),

		// Maps
		GOOGLE_MAPS_API_KEY: z.string(),

		// Payment (HitPay)
		HITPAY_API_KEY: z.string(),
		HITPAY_API_URL: z.string(),
		HITPAY_WEBHOOK_SALT: z.string(),

		// KYC (HyperVerge)
		HYPERVERGE_API_URL: z.string(),
		HYPERVERGE_APP_ID: z.string(),
		HYPERVERGE_APP_KEY: z.string(),
		HYPERVERGE_DIRECT_LIVENESS_ENABLED: z.enum(["true", "false"]).default("true"),
		HYPERVERGE_WORKFLOW_ID: z.string(),

		// Server Configuration
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		PORT: z.coerce.number().optional(),
		SEED_VALUE: z.coerce.number().optional(),

		// Storage
		SUPABASE_SERVICE_ROLE_KEY: z.string(),

		// Video SDK (Meetings)
		VIDEO_SDK_API_KEY: z.string(),
		VIDEO_SDK_SECRET: z.string(),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// Public Site URL
		NEXT_PUBLIC_SITE_URL: z.string(),

		// Storage (Supabase)
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
		NEXT_PUBLIC_SUPABASE_URL: z.string(),

		// Video SDK (Meetings)
		NEXT_PUBLIC_VIDEO_SDK_API_KEY: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		// Auth
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
		AUTH_URL: process.env.AUTH_URL,

		// Database
		DATABASE_URL: process.env.DATABASE_URL,

		// DocOnChain
		DOCONCHAIN_API_URL: process.env.DOCONCHAIN_API_URL,
		DOCONCHAIN_APP_URL: process.env.DOCONCHAIN_APP_URL,
		DOCONCHAIN_CLIENT_KEY: process.env.DOCONCHAIN_CLIENT_KEY,
		DOCONCHAIN_CLIENT_SECRET: process.env.DOCONCHAIN_CLIENT_SECRET,
		DOCONCHAIN_EMAIL: process.env.DOCONCHAIN_EMAIL,
		DOCONCHAIN_ORG_INVITE_CODE: process.env.DOCONCHAIN_ORG_INVITE_CODE,
		DOCONCHAIN_ORGANIZATION_ID: process.env.DOCONCHAIN_ORGANIZATION_ID,

		// Email
		EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
		EMAIL_FROM: process.env.EMAIL_FROM,
		EMAIL_HOST: process.env.EMAIL_HOST,
		EMAIL_PASS: process.env.EMAIL_PASS,
		EMAIL_PORT: process.env.EMAIL_PORT,
		EMAIL_USER: process.env.EMAIL_USER,

		// Maps
		GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

		// Payment (HitPay)
		HITPAY_API_KEY: process.env.HITPAY_API_KEY,
		HITPAY_API_URL: process.env.HITPAY_API_URL,
		HITPAY_WEBHOOK_SALT: process.env.HITPAY_WEBHOOK_SALT,

		// KYC (HyperVerge)
		HYPERVERGE_API_URL: process.env.HYPERVERGE_API_URL,
		HYPERVERGE_APP_ID: process.env.HYPERVERGE_APP_ID,
		HYPERVERGE_APP_KEY: process.env.HYPERVERGE_APP_KEY,
		HYPERVERGE_DIRECT_LIVENESS_ENABLED: process.env.HYPERVERGE_DIRECT_LIVENESS_ENABLED,
		HYPERVERGE_WORKFLOW_ID: process.env.HYPERVERGE_WORKFLOW_ID,

		// Server Configuration
		NODE_ENV: process.env.NODE_ENV,
		PORT: process.env.PORT,
		SEED_VALUE: process.env.SEED_VALUE,

		// Storage
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

		// Video SDK (Meetings)
		VIDEO_SDK_API_KEY: process.env.VIDEO_SDK_API_KEY,
		VIDEO_SDK_SECRET: process.env.VIDEO_SDK_SECRET,

		// Public Site URL
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,

		// Storage (Supabase)
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,

		// Video SDK (Meetings)
		NEXT_PUBLIC_VIDEO_SDK_API_KEY: process.env.NEXT_PUBLIC_VIDEO_SDK_API_KEY,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
})
