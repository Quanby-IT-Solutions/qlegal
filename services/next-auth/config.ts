// import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { type DefaultSession, type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { db } from "@/services/drizzle/db"
import { twoFactorConfirmations, users, type UserRole } from "@/services/drizzle/schema/auth"
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
			kycStatus?: string
			kycTransactionId?: string | null
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
						session.user.name = user.name ?? ""
						session.user.email = user.email ?? ""
						session.user.role = user.role
						// Include KYC status in session for gating post-login
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const kycStatusValue = user.kycStatus
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const kycTransactionIdValue = user.kycTransactionId
						session.user.kycStatus = (kycStatusValue ?? "NOT_STARTED") as string
						session.user.kycTransactionId = (kycTransactionIdValue ?? null) as string | null

						// Convert Supabase storage paths to displayable URLs
						const imagePath = user.image ?? session.user.image
						if (imagePath?.startsWith("http")) {
							session.user.image = imagePath
						} else if (imagePath) {
							const { getPublicClient } = await import("@/services/supabase")
							const supabase = getPublicClient()
							const { data } = supabase.storage.from("avatars").getPublicUrl(imagePath)
							session.user.image = data.publicUrl
						}
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
				token.name = user.name
				token.email = user.email
				token.image = user.image ?? token.picture
				// Attach initial KYC info from user, default to "NOT_STARTED" if not set
				// Extract KYC fields safely - user may have extended properties from adapter
				 
				const userKycStatus = (user as { kycStatus?: string }).kycStatus
				 
				const userKycTransactionId = (user as { kycTransactionId?: string | null }).kycTransactionId
				// ts-expect-error augment token
				token.kycStatus = (userKycStatus ?? "NOT_STARTED")
				// ts-expect-error augment token
				token.kycTransactionId = (userKycTransactionId ?? null)
			}

			// On subsequent runs, enrich token with KYC from DB
			if (!user && token.sub) {
				try {
					const existing = await db.query.users.findFirst({
						where: (data, { eq }) => eq(data.id, token.sub ?? ""),
					})
					if (existing) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const existingKycStatus = existing.kycStatus
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const existingKycTransactionId = existing.kycTransactionId
						// ts-expect-error augment token
						token.kycStatus = (existingKycStatus ?? "NOT_STARTED") as string
						// ts-expect-error augment token
						token.kycTransactionId = (existingKycTransactionId ?? null) as string | null
					}
				} catch {
					// Silently handle errors when enriching token with KYC data
				}
			}

			return token
		},
	},
	events: {
		async linkAccount({ user, profile }) {
			const existingUser = await db.query.users.findFirst({
				where: (data, { eq }) => eq(data.email, user.email ?? ""),
			})

			if (existingUser && !(existingUser instanceof Error)) {
				await db
					.update(users)
					.set({
						emailVerified: new Date(),
						image: existingUser?.image ?? profile.image,
					})
					.where(eq(users.id, existingUser.id))
			}
		},
	},
} satisfies NextAuthConfig
