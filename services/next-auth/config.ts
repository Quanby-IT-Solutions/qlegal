// import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { type DefaultSession, type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { db } from "@/services/drizzle/db"
import { twoFactorConfirmations, type UserRole } from "@/services/drizzle/schema/auth"
import { DrizzleCustomAdapter } from "@/services/next-auth/adapter"

import { loginSchema } from "@/features/auth/api/auth.schemas"

import { env } from "@/env"

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
	debug: env.NODE_ENV !== "production",
	pages: {
		signIn: "/auth/login",
	},
	providers: [
		Credentials({
			async authorize(credentials, _req) {
				const validatedFields = loginSchema.safeParse(credentials)

				if (!validatedFields.success) {
					return null
				}

				const { email, password } = validatedFields.data

				const user = await db.query.users.findFirst({
					where: (data, { eq }) => eq(data.email, email),
				})

				if (user instanceof Error || !user?.password) {
					return null
				}

				const isPasswordValid = await compare(password, user.password)

				if (!isPasswordValid) {
					return null
				}

				return user
			},
		}),
		Google({
			allowDangerousEmailAccountLinking: true,
			authorization: {
				params: {
					prompt: "select_account",
				},
			},
		}),
	],
	adapter: DrizzleCustomAdapter(),
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
			try {
				if (token.sub) {
					const user = await db.query.users.findFirst({
						where: (data, { eq }) => eq(data.id, token.sub ?? ""),
					})
					if (user && session.user) {
						session.user.id = token.sub
						session.user.role = user.role
					}
				}
			} catch {
				if (token.sub && session.user) {
					session.user.id = token.sub
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
