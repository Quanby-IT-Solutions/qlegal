import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { type DefaultSession, type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { getFullName } from "@/core/lib/utils"
import { db } from "@/services/drizzle/db"
import { twoFactorConfirmations, users, type UserRole } from "@/services/drizzle/schema/auth"
import { DrizzleCustomAdapter } from "@/services/next-auth/adapter"

import { loginSchema } from "@/features/auth/api/auth.schemas"
import { autoJoinMemberInDoconchainOrganization } from "@/services/doconchain/organization/auto-join-member"

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
			status?: string
			kycStatus?: string
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
	trustHost: true,
	pages: {
		error: "/error",
		signIn: "/auth/login",
	},
	providers: [
		Credentials({
			async authorize(credentials) {
				const validatedFields = loginSchema.safeParse(credentials)

				if (!validatedFields.success) {
					return null
				}

				const { email, password } = validatedFields.data

				const user = await db.query.users.findFirst({
					where: (data, { eq }) => eq(data.email, email),
				})

				if (!user?.password) {
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
			// Ensure user is in DocOnChain organization on login (idempotent; 409 = already member).
			const ensureOrgMembership = async (userId: string) => {
				const u = await db.query.users.findFirst({
					where: (data, { eq }) => eq(data.id, userId),
					columns: { email: true, firstName: true, middleName: true, lastName: true },
				})
				const email = u?.email?.trim()
				if (email) {
					void autoJoinMemberInDoconchainOrganization({
						email,
						name: getFullName(u) || undefined,
						role: "Member",
					}).catch(() => {
						// Do not block login; org sync is best-effort.
					})
				}
			}

			if (account?.provider !== "credentials") {
				if (user.id) {
					void ensureOrgMembership(user.id)
				}
				return true
			}

			if (!user.id) {
				return false
			}

			const userId = user.id
			const existingUser = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.id, userId),
			})

			if (!existingUser?.emailVerified) {
				return false
			}

			if (!existingUser.isTwoFactorEnabled) {
				void ensureOrgMembership(userId)
				return true
			}

			const twoFactorConfirmation = await db.query.twoFactorConfirmations.findFirst({
				where: (data, { eq }) => eq(data.userId, existingUser.id),
			})

			if (!twoFactorConfirmation) {
				return false
			}

			await db
				.delete(twoFactorConfirmations)
				.where(eq(twoFactorConfirmations.userId, existingUser.id))

			void ensureOrgMembership(userId)
			return true
		},
		async session({ session, token }) {
			if (!token.sub || !session.user) {
				return session
			}

			const userId = token.sub

			try {
				const user = await db.query.users.findFirst({
					where: (data, { eq }) => eq(data.id, userId),
				})

				if (!user) {
					return session
				}

				session.user.id = userId
				session.user.name = getFullName(user) ?? ""
				session.user.email = user.email ?? ""
				session.user.role = user.role
				session.user.status = (user.commissionStatus ?? "PENDING") as string
				session.user.kycStatus = (user.kycStatus ?? "NOT_STARTED") as string

				// Convert Supabase storage paths to displayable URLs
				const imagePath = user.image ?? session.user.image
				if (imagePath?.startsWith("http")) {
					session.user.image = imagePath
				} else if (imagePath) {
					const { getPublicClient } = await import("@/services/supabase")
					const supabase = getPublicClient()
					const { data } = supabase.storage.from("avatar").getPublicUrl(imagePath)
					session.user.image = data.publicUrl
				}
			} catch {
				// Fallback to token data if DB query fails
				session.user.id = userId
				if (token.status) {
					session.user.status = token.status as string
				}
				if (token.kycStatus) {
					session.user.kycStatus = token.kycStatus as string
				}
			}

			return session
		},
		async jwt({ token, user }) {
			if (user) {
				token.sub = user.id
				token.name = user.name
				token.email = user.email
				token.image = user.image ?? token.picture

				// Extract KYC and status fields safely - user may have extended properties from adapter
				const userWithKyc = user as {
					kycStatus?: string
					commissionStatus?: string
				}
				token.status = userWithKyc.commissionStatus ?? "PENDING"
				token.kycStatus = userWithKyc.kycStatus ?? "NOT_STARTED"
			}

			// On subsequent runs, enrich token with KYC from DB
			if (!user && token.sub) {
				const userId = token.sub

				try {
					const existing = await db.query.users.findFirst({
						where: (data, { eq }) => eq(data.id, userId),
					})

					if (existing) {
						token.status = (existing.commissionStatus ?? "PENDING") as string
						token.kycStatus = (existing.kycStatus ?? "NOT_STARTED") as string
					}
				} catch {
					// Silently fail - token will use existing values
				}
			}

			return token
		},
	},
	events: {
		async linkAccount({ user, profile }) {
			if (!user.email) {
				return
			}

			const userEmail = user.email
			const existingUser = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.email, userEmail),
			})

			if (existingUser) {
				await db
					.update(users)
					.set({
						emailVerified: new Date(),
						image: existingUser.image ?? profile.image,
					})
					.where(eq(users.id, existingUser.id))
			}
		},
	},
} satisfies NextAuthConfig
