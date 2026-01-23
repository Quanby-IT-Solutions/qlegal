import { env } from "@/env"

import { apiCall } from "../lib/http-client"

export async function getVaultItems(
	userEmail: string,
	options: {
		perPage?: number
		page?: number
		userItemsOnly?: boolean
		apiIntegratedProjectsOnly?: boolean
	} = {}
): Promise<Record<string, unknown>> {
	const {
		perPage = 15,
		page = 1,
		userItemsOnly = false,
		apiIntegratedProjectsOnly = false,
	} = options

	const params = new URLSearchParams({
		user_type: "ENTERPRISE_API",
		per_page: String(perPage),
		page: String(page),
		user_items_only: userItemsOnly ? "yes" : "no",
		api_integrated_projects_only: apiIntegratedProjectsOnly ? "yes" : "no",
	})

	const response = await apiCall(async token => {
		return fetch(`${env.DOCONCHAIN_API_URL}/vault/items?${params.toString()}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		})
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as Record<string, unknown>
}

export async function getVaultItem(
	projectUuid: string,
	userEmail?: string
): Promise<{ data?: { files?: Array<{ file_url?: string; url?: string }> } }> {
	const response = await apiCall(async token => {
		return fetch(`${env.DOCONCHAIN_API_URL}/vault/items/${projectUuid}?user_type=ENTERPRISE_API`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		})
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as {
		data?: { files?: Array<{ file_url?: string; url?: string }> }
	}
}
