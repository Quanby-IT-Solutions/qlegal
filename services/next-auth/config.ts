import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { type DefaultSession, type NextAuthConfig } from "next-auth"

import { db } from "@/services/drizzle/db"

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string
			name: string
			email: string
			image: string
		}
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	pages: {
		signIn: "/auth/login",
	},
	providers: [],
	adapter: DrizzleAdapter(db),
	session: { strategy: "jwt" },
} satisfies NextAuthConfig
