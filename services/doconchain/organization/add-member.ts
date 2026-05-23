import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

function splitName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim()
	if (!trimmed) {
		return { firstName: "User", lastName: "User" }
	}

	const parts = trimmed.split(/\s+/)
	if (parts.length === 1) {
		return { firstName: parts[0]!, lastName: parts[0]! }
	}

	return {
		firstName: parts[0]!,
		lastName: parts.slice(1).join(" "),
	}
}

export async function addMemberInDoconchainOrganization(input: {
	email: string
	name: string
	role?: "Member" | "Admin"
}): Promise<{ invited: boolean; alreadyMember: boolean }> {
	const { firstName, lastName } = splitName(input.name)

	const token = await getDoconchainApiToken()

	const url = new URL("/api/v2/organization/members/add", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const body = new FormData()
	body.set("data[0][email]", input.email)
	body.set("data[0][first_name]", firstName)
	body.set("data[0][last_name]", lastName)
	body.set("data[0][role]", input.role ?? "Member")
	body.set("data[0][organization_id]", String(env.DOCONCHAIN_ORGANIZATION_ID))

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body,
	})

	// DocoChain returns 409 when the user already exists in the organization.
	if (res.status === 409) {
		return { invited: false, alreadyMember: true }
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		throw new Error(
			`DocOnChain add member failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	return { invited: true, alreadyMember: false }
}
