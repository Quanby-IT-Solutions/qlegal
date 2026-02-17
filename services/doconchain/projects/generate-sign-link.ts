import { env } from "@/env"
import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

type GenerateSignLinkResponse =
	| { message?: { link?: string } }
	| { link?: string }
	| { data?: { link?: string } }

function findFirstUrlLike(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim()
		// DocOnChain commonly returns short links under link.doconchain.com
		if (/^https?:\/\/link\.doconchain\.com\//i.test(trimmed)) return trimmed
		// Sometimes app URLs may be returned instead
		if (/^https?:\/\/stg-app\.doconchain\.com\//i.test(trimmed)) return trimmed
		return undefined
	}

	if (!value || typeof value !== "object") return undefined

	// Walk objects/arrays recursively (bounded by structure size in practice).
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findFirstUrlLike(item)
			if (found) return found
		}
		return undefined
	}

	for (const v of Object.values(value as Record<string, unknown>)) {
		const found = findFirstUrlLike(v)
		if (found) return found
	}
	return undefined
}

async function postGenerateSignLink(params: {
	projectUuid: string
	token: string
	signerEmail: string
}): Promise<string> {
	const url = new URL(`/api/v2/projects/${params.projectUuid}/link/generate`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("email", params.signerEmail)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.token}`,
			accept: "application/json",
			// DocOnChain expects JSON headers even with no body.
			"content-type": "application/json",
		},
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		const err = new Error(
			`DocOnChain generate sign link failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	// Some DocOnChain responses are nested; try known shapes first then fall back to a deep URL search.
	let parsed: unknown = {}
	if (text.trim()) {
		// If the API ever returns a raw URL string, accept it.
		const raw = findFirstUrlLike(text)
		if (raw) return raw
		parsed = JSON.parse(text) as unknown
	}

	const json = parsed as GenerateSignLinkResponse
	const link =
		(typeof json === "object" && json !== null && "message" in json
			? (json as { message?: { link?: string } }).message?.link
			: undefined) ??
		(typeof json === "object" && json !== null && "link" in json ? (json as { link?: string }).link : undefined) ??
		(typeof json === "object" && json !== null && "data" in json
			? (json as { data?: { link?: string } }).data?.link
			: undefined) ??
		findFirstUrlLike(parsed)

	if (!link) {
		throw new Error(
			`DocOnChain generate sign link response missing link.${text ? ` Raw response: ${text}` : ""}`
		)
	}

	return link
}

export async function generateDoconchainSignLink(input: {
	projectUuid: string
	signerEmail: string
}): Promise<string> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const signerEmail = input.signerEmail.trim().toLowerCase()
	if (!signerEmail) throw new Error("Signer email is required to generate sign link.")

	const doRequest = async () => {
		const token = await getDoconchainApiToken({ email: signerEmail, forceGenerated: true })
		return await postGenerateSignLink({ projectUuid, token, signerEmail })
	}

	try {
		return await doRequest()
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			invalidateDoconchainToken(signerEmail)
			return await doRequest()
		}
		throw error
	}
}

