import { env } from "@/env"

import { apiCall } from "../lib/http-client"

type PassportView =
	| "blockchain"
	| "history"
	| "user_data"
	| "verifiable_presentation"
	| "certificate_url"

export async function getPassportDocument(
	projectUuid: string,
	view: PassportView = "blockchain",
	userEmail?: string
): Promise<Record<string, unknown> | string> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/passport?user_type=ENTERPRISE_API&view=${view}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const result: unknown = await response.json()

	if (typeof result === "string") return result
	if (typeof result === "object" && result !== null) return result as Record<string, unknown>
	return {}
}
