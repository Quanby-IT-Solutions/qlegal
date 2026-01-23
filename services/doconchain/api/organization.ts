import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { generateToken } from "../lib/token-cache"
import { splitName } from "../lib/utils"

interface AutoJoinParams {
	email: string
	firstName: string
	lastName: string
	role?: string
	organizationId?: string
	userEmail?: string
}

export async function autoJoinOrganization({
	email,
	firstName,
	lastName,
	role = "Member",
	organizationId,
	userEmail,
}: AutoJoinParams): Promise<void> {
	const orgId = organizationId ?? env.DOCONCHAIN_ORGANIZATION_ID
	if (!orgId) return

	const formData = new FormData()
	formData.append("data[0][email]", email)
	formData.append("data[0][first_name]", firstName)
	formData.append("data[0][last_name]", lastName)
	formData.append("data[0][role]", role)
	formData.append("data[0][organization_id]", orgId)

	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: formData,
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()

		if (response.status === 409) return
		if (response.status === 400 && errorText.includes("already exist")) return
		if (response.status === 401 || response.status === 403) return

		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}
}

export async function ensureJoinedToOrganization({
	email,
	firstName,
	lastName,
	role = "Member",
	organizationId,
	userEmail,
}: AutoJoinParams): Promise<void> {
	const orgId = organizationId ?? env.DOCONCHAIN_ORGANIZATION_ID
	if (!orgId) {
		throw new Error("doconchain organization ID not configured (DOCONCHAIN_ORGANIZATION_ID)")
	}

	const authEmail = userEmail ?? env.DOCONCHAIN_EMAIL

	const formData = new FormData()
	formData.append("data[0][email]", email)
	formData.append("data[0][first_name]", firstName)
	formData.append("data[0][last_name]", lastName)
	formData.append("data[0][role]", role)
	formData.append("data[0][organization_id]", orgId)

	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: formData,
			}
		)
	}, authEmail)

	if (response.ok) return

	const errorText = await response.text()

	if (response.status === 409) return
	if (response.status === 400 && errorText.toLowerCase().includes("already")) return

	if (response.status === 401 || response.status === 403) {
		throw new Error(
			`doconchain auto-join unauthorized (${response.status}). Ensure the auth identity has org-member permissions. Body: ${errorText}`
		)
	}

	throw new Error(
		`doconchain auto-join failed: ${response.status} ${response.statusText} - ${errorText}`
	)
}

interface ProvisionUserParams {
	email: string
	name?: string | null
	role?: string
	organizationId?: string
	userEmailForAuth?: string
}

export async function provisionUser({
	email,
	name,
	role = "Member",
	organizationId,
	userEmailForAuth,
}: ProvisionUserParams): Promise<{ joinedOrganization: boolean; userTokenGenerated: boolean }> {
	const { firstName, lastName } = splitName(name ?? undefined)

	let joinedOrganization = false
	try {
		await ensureJoinedToOrganization({
			email,
			firstName,
			lastName,
			role,
			organizationId,
			userEmail: userEmailForAuth,
		})
		joinedOrganization = true
	} catch {
		// Continue with registration anyway
	}

	try {
		await generateToken(email, true)
		return { joinedOrganization, userTokenGenerated: true }
	} catch {
		return { joinedOrganization, userTokenGenerated: false }
	}
}
