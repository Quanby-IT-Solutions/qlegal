import { and, eq } from "drizzle-orm"
import type {
	Adapter,
	AdapterAccount,
	AdapterSession,
	AdapterUser,
	VerificationToken,
} from "next-auth/adapters"

import { db } from "@/services/drizzle/db"
import { accounts, sessions, users, verificationTokens } from "@/services/drizzle/schema/auth"

export function DrizzleCustomAdapter(): Adapter {
	return {
		async createUser(data: AdapterUser) {
			const { id, ...insert } = data
			const [user] = await db
				.insert(users)
				.values(
					id
						? ({ id, ...insert } as typeof users.$inferInsert)
						: (insert as typeof users.$inferInsert)
				)
				.returning()
			return user as AdapterUser
		},
		async getUser(id: string) {
			const user = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, id) })
			return (user ?? null) as AdapterUser | null
		},
		async getUserByEmail(email: string) {
			const user = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.email, email) })
			return (user ?? null) as AdapterUser | null
		},
		async getUserByAccount(account: Pick<AdapterAccount, "provider" | "providerAccountId">) {
			const res = await db
				.select({ account: accounts, user: users })
				.from(accounts)
				.innerJoin(users, eq(accounts.userId, users.id))
				.where(
					and(
						eq(accounts.provider, account.provider),
						eq(accounts.providerAccountId, account.providerAccountId)
					)
				)
				.limit(1)
			return (res[0]?.user ?? null) as AdapterUser | null
		},
		async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
			if (!data.id) {
				throw new Error("No user id.")
			}
			const [updated] = await db
				.update(users)
				.set(data as Partial<typeof users.$inferInsert> & Pick<typeof users.$inferInsert, "id">)
				.where(eq(users.id, data.id))
				.returning()
			if (!updated) {
				throw new Error("No user found.")
			}
			return updated as AdapterUser
		},
		async deleteUser(id: string) {
			await db.delete(users).where(eq(users.id, id))
		},
		async linkAccount(data: AdapterAccount) {
			await db.insert(accounts).values(data as typeof accounts.$inferInsert)
		},
		async unlinkAccount(params: Pick<AdapterAccount, "provider" | "providerAccountId">) {
			await db
				.delete(accounts)
				.where(
					and(
						eq(accounts.provider, params.provider),
						eq(accounts.providerAccountId, params.providerAccountId)
					)
				)
		},
		async getAccount(providerAccountId: string, provider: string) {
			const rows = await db
				.select()
				.from(accounts)
				.where(
					and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId))
				)
				.limit(1)
			return (rows[0] ?? null) as AdapterAccount | null
		},
		async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
			const [sessionRow] = await db.insert(sessions).values(data).returning()
			return sessionRow as AdapterSession
		},
		async getSessionAndUser(sessionToken: string) {
			const res = await db
				.select({ session: sessions, user: users })
				.from(sessions)
				.innerJoin(users, eq(users.id, sessions.userId))
				.where(eq(sessions.sessionToken, sessionToken))
				.limit(1)
			if (!res[0]) {
				return null
			}
			return res[0] as { session: AdapterSession; user: AdapterUser }
		},
		async updateSession(data: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
			const [updated] = await db
				.update(sessions)
				.set(
					data as Partial<typeof sessions.$inferInsert> &
						Pick<typeof sessions.$inferInsert, "sessionToken">
				)
				.where(eq(sessions.sessionToken, data.sessionToken))
				.returning()
			return updated as AdapterSession
		},
		async deleteSession(sessionToken: string) {
			await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken))
		},
		async createVerificationToken(data: VerificationToken) {
			const [row] = await db
				.insert(verificationTokens)
				.values({
					email: data.identifier,
					token: data.token,
					expires: data.expires,
				} as typeof verificationTokens.$inferInsert)
				.returning()
			if (!row) {
				return { identifier: data.identifier, token: data.token, expires: data.expires }
			}
			return {
				identifier: row.email,
				token: row.token,
				expires: row.expires,
			} as VerificationToken
		},
		async useVerificationToken(params: { identifier: string; token: string }) {
			const [row] = await db
				.delete(verificationTokens)
				.where(
					and(
						eq(verificationTokens.email, params.identifier),
						eq(verificationTokens.token, params.token)
					)
				)
				.returning()
			return row
				? ({
						identifier: row.email,
						token: row.token,
						expires: row.expires,
					} as VerificationToken)
				: null
		},
	}
}
