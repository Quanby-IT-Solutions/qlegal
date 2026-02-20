import { env } from "@/env"
import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

// NOTE: DocOnChain responses vary (sometimes nested, sometimes arrays). We parse defensively at runtime below.

function maskEmailForLog(email: string): string {
	const trimmed = email.trim()
	const at = trimmed.indexOf("@")
	if (at <= 0) return "***"
	const name = trimmed.slice(0, at)
	const domain = trimmed.slice(at + 1)
	const prefix = name.slice(0, 2)
	return `${prefix}${name.length > 2 ? "***" : "*"}@${domain}`
}

function redactDoconchainUrlForLog(urlString: string): string {
	try {
		const url = new URL(urlString)
		for (const key of ["token", "api_token"]) {
			if (url.searchParams.has(key)) url.searchParams.set(key, "***")
		}
		if (url.searchParams.has("email")) url.searchParams.set("email", "***")
		return url.toString()
	} catch {
		return urlString
	}
}

function findFirstUrlLike(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim()
		// DocOnChain commonly returns short links under link.doconchain.com
		if (/^https?:\/\/link\.doconchain\.com\//i.test(trimmed)) return trimmed
		// Sometimes app URLs may be returned instead
		if (/^https?:\/\/stg-app\.doconchain\.com\//i.test(trimmed)) return trimmed
		// Allow other DocOnChain app domains too (prod, alt envs)
		if (/^https?:\/\/([a-z0-9-]+\.)?doconchain\.com\//i.test(trimmed)) return trimmed
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

	console.log("🟣 [DocOnChain] signLink:request", {
		projectUuid: params.projectUuid,
		email: maskEmailForLog(params.signerEmail),
		endpoint: `/api/v2/projects/${params.projectUuid}/link/generate`,
	})

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
		console.error("🟣 [DocOnChain] signLink:response:notOk", {
			projectUuid: params.projectUuid,
			status: res.status,
			statusText: res.statusText,
			bodyPreview: text.slice(0, 500),
		})
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
		if (raw) {
			console.log("🟣 [DocOnChain] signLink:response:rawUrl", {
				projectUuid: params.projectUuid,
				link: redactDoconchainUrlForLog(raw),
			})
			return raw
		}
		parsed = JSON.parse(text) as unknown
	}

	// IMPORTANT: some APIs may return arrays. Using `"link" in json` on arrays will match Array.prototype.link (a function).
	// Always prefer the recursive URL finder, and only read "link" props from plain objects with OWN properties.
	const linkFromDeepSearch = findFirstUrlLike(parsed)
	const linkFromObjectShape = (() => {
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined
		const obj = parsed as Record<string, unknown>
		if (Object.hasOwn(obj, "message")) {
			const v = (obj as { message?: unknown }).message
			if (v && typeof v === "object" && !Array.isArray(v) && Object.hasOwn(v as Record<string, unknown>, "link")) {
				const maybe = (v as { link?: unknown }).link
				return typeof maybe === "string" ? maybe : undefined
			}
		}
		if (Object.hasOwn(obj, "link")) {
			const maybe = (obj as { link?: unknown }).link
			return typeof maybe === "string" ? maybe : undefined
		}
		if (Object.hasOwn(obj, "data")) {
			const v = (obj as { data?: unknown }).data
			if (v && typeof v === "object" && !Array.isArray(v) && Object.hasOwn(v as Record<string, unknown>, "link")) {
				const maybe = (v as { link?: unknown }).link
				return typeof maybe === "string" ? maybe : undefined
			}
		}
		return undefined
	})()

	const link = linkFromObjectShape ?? linkFromDeepSearch

	if (!link) {
		console.error("🟣 [DocOnChain] signLink:response:missingLink", {
			projectUuid: params.projectUuid,
			bodyPreview: text.slice(0, 500),
		})
		throw new Error(
			`DocOnChain generate sign link response missing link.${text ? ` Raw response: ${text}` : ""}`
		)
	}

	console.log("🟣 [DocOnChain] signLink:response:ok", {
		projectUuid: params.projectUuid,
		link: redactDoconchainUrlForLog(link),
	})
	return link
}

/**
 * Generate a DocOnChain signing link for a signer.
 * Uses projectOwnerEmail (ENP) token when provided so the signer does not need to be a DocOnChain user.
 * If projectOwnerEmail is omitted, uses signerEmail token (signer must exist in DocOnChain).
 */
export async function generateDoconchainSignLink(input: {
	projectUuid: string
	signerEmail: string
	/** When set, we use this user's token to request the link (project owner / ENP). Signer does not need to exist in DocOnChain. */
	projectOwnerEmail?: string
}): Promise<string> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const signerEmail = input.signerEmail.trim().toLowerCase()
	if (!signerEmail) throw new Error("Signer email is required to generate sign link.")

	const tokenEmail = input.projectOwnerEmail?.trim().toLowerCase() ?? signerEmail

	const doRequest = async () => {
		const token = await getDoconchainApiToken({ email: tokenEmail, forceGenerated: true })
		return postGenerateSignLink({ projectUuid, token, signerEmail })
	}

	try {
		return doRequest()
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			const invalidate = invalidateDoconchainToken as (email: string) => void
			invalidate(tokenEmail)
			return doRequest()
		}
		throw error
	}
}

