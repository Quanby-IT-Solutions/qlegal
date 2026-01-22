import { z } from "zod/v4"

import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { getToken } from "../lib/token-cache"

const signLinkResponseSchema = z.object({
	data: z.object({
		link: z.string(),
	}),
})

const editDraftLinkResponseSchema = z.object({
	message: z.string(),
})

interface GenerateSignLinkParams {
	projectUuid: string
	email: string
	userEmail?: string
}

export async function generateSignLink({
	projectUuid,
	email,
	userEmail,
}: GenerateSignLinkParams): Promise<{ link: string }> {
	const apiUrl = `${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link/generate?email=${encodeURIComponent(email)}&user_type=ENTERPRISE_API`

	const response = await apiCall(async token => {
		return fetch(apiUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
		})
	}, userEmail ?? email)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	const json: unknown = await response.json()
	const result = signLinkResponseSchema.safeParse(json)

	if (!result.success) {
		throw new Error(`doconchain returned invalid response: ${JSON.stringify(json)}`)
	}

	const link = await appendApiToken(result.data.data.link, userEmail ?? email)
	return { link }
}

export async function generateEditDraftLink(
	projectUuid: string,
	userEmail?: string
): Promise<{ link: string }> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/api/v2/projects/${projectUuid}/link?user_type=ENTERPRISE_API`,
			{
				method: "POST",
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

	const json: unknown = await response.json()
	const result = editDraftLinkResponseSchema.safeParse(json)

	if (!result.success) {
		throw new Error(`doconchain returned invalid response: ${JSON.stringify(json)}`)
	}

	const link = normalizeLink(result.data.message)
	return { link }
}

export function getSigningUrl(projectUuid: string): string {
	return `${env.DOCONCHAIN_APP_URL}/${projectUuid}`
}

function normalizeLink(link: string): string {
	if (!link.startsWith("http")) {
		link = link.startsWith("/")
			? `${env.DOCONCHAIN_APP_URL}${link}`
			: `${env.DOCONCHAIN_APP_URL}/${link}`
	}

	const url = new URL(link)
	url.searchParams.set("api", "true")
	url.searchParams.delete("api_token")
	if (url.searchParams.get("status") === "Deleted") {
		url.searchParams.delete("status")
	}
	return url.toString()
}

async function appendApiToken(link: string, email: string): Promise<string> {
	const url = new URL(normalizeLink(link))

	if (!url.searchParams.has("api_token")) {
		const apiToken = await getToken(email)
		url.searchParams.set("api_token", apiToken)
	}

	return url.toString()
}
