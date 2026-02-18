import { env } from "@/env"
import { generateDoconchainToken } from "@/services/doconchain/auth/generate-token"

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

function nameFromEmail(email: string): string {
	const local = email.split("@")[0]?.trim()
	if (!local) return "User"
	return local.replace(/[._-]+/g, " ").trim() || "User"
}

export async function autoJoinMemberInDoconchainOrganization(input: {
	email: string
	name?: string
	role?: "Member" | "Admin"
}): Promise<{ joined: boolean; alreadyMember: boolean }> {
	const email = input.email.trim().toLowerCase()
	if (!email) {
		throw new Error("DocOnChain auto-join requires a non-empty email.")
	}

	// Use an org/admin token to perform auto-join.
	const { token } = await generateDoconchainToken({ email: env.DOCONCHAIN_EMAIL })

	const displayName = (input.name ?? "").trim() || nameFromEmail(email)
	const { firstName, lastName } = splitName(displayName)

	const url = new URL("/api/v2/organization/members/auto-join", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const body = new FormData()
	body.set("data[0][email]", email)
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
		return { joined: false, alreadyMember: true }
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		throw new Error(
			`DocOnChain auto-join failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	return { joined: true, alreadyMember: false }
}

