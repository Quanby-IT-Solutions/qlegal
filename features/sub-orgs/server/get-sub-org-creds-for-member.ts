import { and, isNotNull } from "drizzle-orm"

import { getDoconchainSubOrgMembers } from "@/services/doconchain/organization/get-sub-org-members"
import type { db as dbType } from "@/services/drizzle/db"
import { doconchainSubOrganizations } from "@/services/drizzle/schema/doconchain-sub-organizations"

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
				const members = await getDoconchainSubOrgMembers({
					subOrganizationUuid: row.uuid,
					clientKey: key,
					clientSecret: secret,
				})
				const found = members.some(m => (m.email ?? "").trim().toLowerCase() === normalized)
				if (found) return { clientKey: key, clientSecret: secret }
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
