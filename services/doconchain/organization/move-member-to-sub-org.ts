import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

type MoveMemberResponse = {
	id?: number
	organization_id?: number
	role?: string
	email?: string
	name?: string
	status?: string
}

/**
 * Move an existing parent-org member to a sub-organization (or another org).
 * PUT .../organization/members/{memberId}/move
 * Body: organization_id (target sub-org numeric id), role (e.g. "Member").
 */
export async function moveDoconchainMemberToSubOrg(input: {
	memberId: number
	targetOrganizationId: number
	role?: string
}): Promise<MoveMemberResponse> {
	const { memberId, targetOrganizationId, role = "Member" } = input

	const url = new URL(
		`/api/v2/organization/members/${memberId}/move`,
		env.DOCONCHAIN_API_URL
	)

	const body = new FormData()
	body.set("organization_id", String(targetOrganizationId))
	body.set("role", role)

	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	let res = await fetch(url.toString(), {
		method: "PUT",
		headers: { Authorization: `Bearer ${token}` },
		body,
	})
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await fetch(url.toString(), {
			method: "PUT",
			headers: { Authorization: `Bearer ${token}` },
			body,
		})
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const parsed = text ? (JSON.parse(text) as { message?: string; error?: string }) : {}
		throw new Error(
			parsed.message ?? parsed.error ?? `DocOnChain move member failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
		)
	}

	return (text ? (JSON.parse(text) as MoveMemberResponse) : {})
}
