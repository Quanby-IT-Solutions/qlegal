import { and, eq, isNotNull } from "drizzle-orm"

import { getDoconchainApiTokenWithEnterpriseCreds } from "@/services/doconchain/auth/generate-token"
import type { db as dbType } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { doconchainSubOrganizations } from "@/services/drizzle/schema/doconchain-sub-organizations"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"

/**
 * Find stored sub-org credentials for a member by email.
 * Uses our DB's sub-org list (with clientKey/clientSecret saved at create time)
 * and DocOnChain sub-org members API with those creds to see which sub-org contains the member.
 * Use this to generate a token for users who are in a sub-org (avoids 401 from parent-token flows).
 */
export async function getSubOrgCredsForMemberEmail(
	email: string,
	db: typeof dbType
): Promise<{ clientKey: string; clientSecret: string } | null> {
	try {
		const normalized = email.trim().toLowerCase()
		if (!normalized) return null

		// Fast-path: if this email is an ENP with an explicitly provisioned sub-org (stored on ENP profile),
		// return that sub-org's stored enterprise credentials. This prevents picking the "wrong" sub-org when
		// a user exists in multiple sub-orgs (which can cause credit/branding mismatches).
		try {
			const user = await db.query.users.findFirst({
				where: eq(users.email, normalized),
				columns: { id: true, role: true },
			})
			if (
				user?.id &&
				String(user.role ?? "")
					.trim()
					.toUpperCase() === "ENP"
			) {
				const profile = await db.query.enpProfiles.findFirst({
					where: eq(enpProfiles.userId, user.id),
					columns: { doconchainSubOrgId: true },
				})
				const subOrgUuid = (profile?.doconchainSubOrgId ?? "").trim()
				if (subOrgUuid) {
					const row = await db.query.doconchainSubOrganizations.findFirst({
						where: eq(doconchainSubOrganizations.uuid, subOrgUuid),
						columns: { clientKey: true, clientSecret: true },
					})
					const key = row?.clientKey ?? null
					const secret = row?.clientSecret ?? null
					if (key && secret) return { clientKey: key, clientSecret: secret }
				}
			}
		} catch {
			// Ignore and fall back to scanning DB sub-orgs.
		}

		const rows = await db
			.select({
				uuid: doconchainSubOrganizations.uuid,
				clientKey: doconchainSubOrganizations.clientKey,
				clientSecret: doconchainSubOrganizations.clientSecret,
			})
			.from(doconchainSubOrganizations)
			.where(
				and(
					isNotNull(doconchainSubOrganizations.clientKey),
					isNotNull(doconchainSubOrganizations.clientSecret)
				)
			)

		for (const row of rows) {
			const key = row.clientKey
			const secret = row.clientSecret
			if (!key || !secret) continue
			try {
				// Instead of listing members (which requires DOCONCHAIN_EMAIL to exist in that sub-org),
				// directly attempt token generation for the member email using this sub-org's creds.
				// If it succeeds, this is the correct sub-org.
				await getDoconchainApiTokenWithEnterpriseCreds({
					email: normalized,
					clientKey: key,
					clientSecret: secret,
				})
				return { clientKey: key, clientSecret: secret }
			} catch {
				// Skip this sub-org and try the next
				continue
			}
		}
		return null
	} catch {
		return null
	}
}
