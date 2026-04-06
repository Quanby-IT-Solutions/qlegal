import { and, eq } from "drizzle-orm"
import type {
	Adapter,
	AdapterAccount,
	AdapterSession,
	AdapterUser,
	VerificationToken,
} from "next-auth/adapters"

import { getFullName } from "@/core/lib/utils"
import { db } from "@/services/drizzle/db"
import { accounts, sessions, users, verificationTokens } from "@/services/drizzle/schema/auth"

export function DrizzleCustomAdapter(): Adapter {
	const pickAdapterUser = (user: typeof users.$inferSelect) => {
		// Safely extract KYC status field - eslint-disable needed due to Drizzle type inference
		 
		const kycStatusValue = user.kycStatus

		return {
			id: user.id,
			name: getFullName(user) || null,
			email: user.email!,
			emailVerified: user.emailVerified ?? null,
			image: user.image ?? null,
			// Include KYC status so it's available in JWT callback
			// ts-expect-error - extending AdapterUser with custom fields
			kycStatus: (kycStatusValue ?? null) as string | null,
		} as AdapterUser & { kycStatus: string | null }
	}

	const mapVerificationRowToToken = (row: typeof verificationTokens.$inferSelect) => ({
		identifier: row.email,
		token: row.token,
		expires: row.expires,
	})

	function splitFullName(fullName: string | null | undefined): {
		firstName: string | null
		middleName: string | null
		lastName: string | null
	} {
		if (!fullName?.trim()) return { firstName: null, middleName: null, lastName: null }
		const parts = fullName.trim().split(/\s+/)
		if (parts.length === 1) return { firstName: parts[0] ?? null, middleName: null, lastName: null }
		return {
			firstName: parts[0] ?? null,
			middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
			lastName: parts[parts.length - 1] ?? null,
		}
	}

	return {
		async createUser(data: AdapterUser) {
			const { id, name, ...rest } = data
			const { firstName, middleName, lastName } = splitFullName(name ?? undefined)
			const toInsert = {
				...(id ? { id } : {}),
				firstName,
				middleName,
				lastName,
				...rest,
			}
			const [user] = await db.insert(users).values(toInsert).returning()

			if (!user) {
				throw new Error("Failed to create user.")
			}

			return pickAdapterUser(user)
		},

		async getUser(id: string) {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, id),
			})

			return user ? pickAdapterUser(user) : null
		},

		async getUserByEmail(email: string) {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.email, email),
			})

			return user ? pickAdapterUser(user) : null
		},

		async getUserByAccount(account: Pick<AdapterAccount, "provider" | "providerAccountId">) {
			const accountRow = await db.query.accounts.findFirst({
				where: (accountTable, { and, eq }) =>
					and(
						eq(accountTable.provider, account.provider),
						eq(accountTable.providerAccountId, account.providerAccountId)
					),
			})

			if (!accountRow) {
				return null
			}

			const userRow = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, accountRow.userId),
			})

			return userRow ? pickAdapterUser(userRow) : null
		},

		async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
			if (!data.id) {
				throw new Error("No user id.")
			}

			const { id, name, ...rest } = data
			const setData =
				name !== undefined
					? { ...rest, ...splitFullName(name) }
					: rest
			const [updated] = await db
				.update(users)
				.set(setData as Partial<typeof users.$inferInsert>)
				.where(eq(users.id, data.id))
				.returning()

			if (!updated) {
				throw new Error("No user found.")
			}

			return pickAdapterUser(updated)
		},

		async deleteUser(id: string) {
			await db.delete(users).where(eq(users.id, id))
		},

		async linkAccount(data: AdapterAccount) {
			await db.insert(accounts).values(data)
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
			const row = await db.query.accounts.findFirst({
				where: (account, { and, eq }) =>
					and(eq(account.provider, provider), eq(account.providerAccountId, providerAccountId)),
			})

			return (row ?? null) as AdapterAccount | null
		},

		async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
			const [sessionRow] = await db.insert(sessions).values(data).returning()

			return sessionRow as AdapterSession
		},

		async getSessionAndUser(sessionToken: string) {
			const sessionRow = await db.query.sessions.findFirst({
				where: (session, { eq }) => eq(session.sessionToken, sessionToken),
				with: { user: true },
			})

			if (!sessionRow) {
				return null
			}

			return {
				session: sessionRow as AdapterSession,
				user: pickAdapterUser(sessionRow.user),
			}
		},
		async updateSession(data: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
			const [updated] = await db
				.update(sessions)
				.set(data)
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
				})
				.returning()

			return row ? mapVerificationRowToToken(row) : { ...data }
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

			return row ? mapVerificationRowToToken(row) : null
		},
	}
}
