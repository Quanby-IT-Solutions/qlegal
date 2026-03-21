import { env } from "@/env"
import type { GetSubOrgCredsForEmail } from "@/services/doconchain/auth/generate-token"
import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

type GenerateLinkResponse =
	| { message?: { link?: string; message?: string } }
	| { link?: string }
	| { data?: { link?: string } }

function addApiTrueParam(urlString: string): string {
	try {
		const url = new URL(urlString)
		// Only mutate DocOnChain web app links (not API endpoints).
		if (!/(\.|^)doconchain\.com$/i.test(url.hostname)) return urlString
		if (url.pathname.startsWith("/api/")) return urlString
		if (url.searchParams.get("api") !== "true") url.searchParams.set("api", "true")
		return url.toString()
	} catch {
		return urlString
	}
}

async function resolveDoconchainRedirects(urlString: string, maxHops = 5): Promise<string> {
	let current = urlString
	for (let hop = 0; hop < maxHops; hop += 1) {
		let url: URL
		try {
			url = new URL(current)
		} catch {
			return current
		}

		// Only attempt to resolve DocOnChain short links (they usually 302 to stg-app / app).
		if (!/^link\.doconchain\.com$/i.test(url.hostname)) return current

		const res = await fetch(current, {
			method: "GET",
			redirect: "manual",
			cache: "no-store",
			headers: {
				accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
			},
		})

		const status = res.status
		if (status !== 301 && status !== 302 && status !== 303 && status !== 307 && status !== 308) {
			return current
		}

		const location = res.headers.get("location")?.trim()
		if (!location) return current
		try {
			current = new URL(location, current).toString()
		} catch {
			return current
		}
	}
	return current
}

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
		if (/^https?:\/\/link\.doconchain\.com\//i.test(trimmed)) return trimmed
		if (/^https?:\/\/stg-app\.doconchain\.com\//i.test(trimmed)) return trimmed
		if (/^https?:\/\/([a-z0-9-]+\.)?doconchain\.com\//i.test(trimmed)) return trimmed
		return undefined
	}

	if (!value || typeof value !== "object") return undefined
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

async function postGenerateLink(params: { projectUuid: string; token: string }): Promise<string> {
	const url = new URL(`/api/v2/projects/${params.projectUuid}/link`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	console.log("🟣 [DocOnChain] editDraftLink:request", {
		projectUuid: params.projectUuid,
		endpoint: `/api/v2/projects/${params.projectUuid}/link`,
	})

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.token}`,
			accept: "application/json",
			"content-type": "application/json",
		},
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		console.error("🟣 [DocOnChain] editDraftLink:response:notOk", {
			projectUuid: params.projectUuid,
			status: res.status,
			statusText: res.statusText,
			bodyPreview: text.slice(0, 500),
		})
		const err = new Error(
			`DocOnChain generate edit draft link failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	let parsed: unknown = {}
	if (text.trim()) {
		const raw = findFirstUrlLike(text)
		if (raw) {
			console.log("🟣 [DocOnChain] editDraftLink:response:rawUrl", {
				projectUuid: params.projectUuid,
				link: redactDoconchainUrlForLog(raw),
			})
			return raw
		}
		parsed = JSON.parse(text) as unknown
	}

	const json = parsed as GenerateLinkResponse
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
		console.error("🟣 [DocOnChain] editDraftLink:response:missingLink", {
			projectUuid: params.projectUuid,
			bodyPreview: text.slice(0, 500),
		})
		throw new Error(
			`DocOnChain generate edit draft link response missing link.${text ? ` Raw response: ${text}` : ""}`
		)
	}

	console.log("🟣 [DocOnChain] editDraftLink:response:ok", {
		projectUuid: params.projectUuid,
		link: redactDoconchainUrlForLog(link),
	})

	// Plot signature links must open the API-integrated DocOnChain app experience.
	// DocOnChain sometimes returns short links; resolve them to the final app URL so we can reliably add `api=true`.
	const resolved = await resolveDoconchainRedirects(link)
	const normalized = addApiTrueParam(resolved)
	if (normalized !== link) {
		console.log("🟣 [DocOnChain] editDraftLink:normalized", {
			projectUuid: params.projectUuid,
			link: redactDoconchainUrlForLog(normalized),
		})
	}
	return normalized
}

export async function generateDoconchainEditDraftProjectLink(input: {
	projectUuid: string
	userEmail: string
	/** When provided, sub-org ENPs get a token via stored sub-org creds (same as ensureDocoChainToken). */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<string> {
	const projectUuid = input.projectUuid.trim()
	if (!projectUuid) throw new Error("Project UUID is required.")

	const email = input.userEmail.trim().toLowerCase()
	if (!email) throw new Error("User email is required to generate project link.")

	const doRequest = async () => {
		const token = await getDoconchainApiToken({
			email,
			forceGenerated: true,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		return postGenerateLink({ projectUuid, token })
	}

	try {
		console.log("🟣 [DocOnChain] editDraftLink:start", {
			projectUuid,
			email: maskEmailForLog(email),
		})
		return doRequest()
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			const invalidate = invalidateDoconchainToken as (email: string) => void
			invalidate(email)
			console.log("🟣 [DocOnChain] editDraftLink:retryAfter401", {
				projectUuid,
				email: maskEmailForLog(email),
			})
			return doRequest()
		}
		throw error
	}
}

