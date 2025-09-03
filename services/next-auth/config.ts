import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import { type DefaultSession, type NextAuthConfig } from "next-auth"

import { db } from "@/services/drizzle/db"
import { twoFactorConfirmations, users, type UserRole } from "@/services/drizzle/schema/auth"

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
			role: UserRole
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
	callbacks: {
		async signIn({ account, user }) {
			if (account?.provider !== "credentials") {
				return true
			}

			const existingUser = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.id, user.id ?? ""),
			})

			if (!existingUser || existingUser instanceof Error) {
				return false
			}

			if (!existingUser.emailVerified) {
				return false
			}

			if (!existingUser.isTwoFactorEnabled) {
				return true
			}

			const twoFactorConfirmation = await db.query.twoFactorConfirmations.findFirst({
				where: (data, { eq }) => eq(data.userId, existingUser.id),
			})

			if (!twoFactorConfirmation || twoFactorConfirmation instanceof Error) {
				return false
			}

			await db
				.delete(twoFactorConfirmations)
				.where(eq(twoFactorConfirmations.userId, existingUser.id))

			return true
		},
		async session({ session, token }) {
			if (token.sub) {
				// Get user role from database
				const [user] = await db
					.select({ role: users.role })
					.from(users)
					.where(eq(users.id, token.sub))
					.limit(1)

				if (user && session.user) {
					session.user.id = token.sub
					session.user.role = user.role
				}
			}

			return session
		},
		async jwt({ token, user }) {
			if (user) {
				token.sub = user.id
			}

			return token
		},
	},
} satisfies NextAuthConfig
