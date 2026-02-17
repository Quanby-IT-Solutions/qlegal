import { env } from "@/env"
import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

type GenerateLinkResponse =
	| { message?: { link?: string; message?: string } }
	| { link?: string }
	| { data?: { link?: string } }

async function postGenerateLink(params: { projectUuid: string; token: string }): Promise<string> {
	const url = new URL(`/api/v2/projects/${params.projectUuid}/link`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.token}`,
			accept: "application/json",
		},
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const err = new Error(
			`DocOnChain generate edit draft link failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	const json = (text ? (JSON.parse(text) as GenerateLinkResponse) : {}) as GenerateLinkResponse
	const link =
		("message" in json ? json.message?.link : undefined) ??
		("link" in json ? json.link : undefined) ??
		("data" in json ? json.data?.link : undefined)

	if (!link) {
		throw new Error("DocOnChain generate edit draft link response missing link.")
	}

	return link
}

export async function generateDoconchainEditDraftProjectLink(input: {
	projectUuid: string
	userEmail: string
}): Promise<string> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const email = input.userEmail.trim().toLowerCase()
	if (!email) throw new Error("User email is required to generate project link.")

	const doRequest = async () => {
		const token = await getDoconchainApiToken({ email, forceGenerated: true })
		return await postGenerateLink({ projectUuid, token })
	}

	try {
		return await doRequest()
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			invalidateDoconchainToken(email)
			return await doRequest()
		}
		throw error
	}
}

