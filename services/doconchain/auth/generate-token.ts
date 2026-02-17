import { env } from "@/env"

type CachedToken = { token: string; expiresAtMs?: number; cachedAtMs: number }

const cachedTokensByEmail = new Map<string, CachedToken>()
const inFlightByEmail = new Map<string, Promise<string>>()

const FALLBACK_TTL_MS = 5 * 60 * 1000
const EXPIRY_SAFETY_WINDOW_MS = 60_000

function parseJwtExpMs(token: string): number | undefined {
	const parts = token.split(".")
	if (parts.length < 2) {
		return undefined
	}

	try {
		const payload = Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
			"utf8"
		)
		const json = JSON.parse(payload) as { exp?: number }
		if (typeof json.exp !== "number") {
			return undefined
		}
		return json.exp * 1000
	} catch {
		return undefined
	}
}

export async function generateDoconchainToken(input?: {
	email?: string
}): Promise<{ token: string }> {
	const url = new URL("/api/v2/generate/token", env.DOCONCHAIN_API_URL)

	const body = new FormData()
	body.set("client_key", env.DOCONCHAIN_CLIENT_KEY)
	body.set("client_secret", env.DOCONCHAIN_CLIENT_SECRET)
	const email = (input?.email ?? env.DOCONCHAIN_EMAIL).trim().toLowerCase()
	body.set("email", email)

	const res = await fetch(url.toString(), {
		method: "POST",
		body,
	})

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		throw new Error(
			`DocOnChain generate token failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	const json = (await res.json().catch(() => null)) as null | { token?: string } | { data?: { token?: string } }
	const token = ("token" in (json ?? {}) ? (json as { token?: string }).token : undefined) ??
		("data" in (json ?? {}) ? (json as { data?: { token?: string } }).data?.token : undefined)

	if (!token) {
		throw new Error("DocOnChain generate token response missing token.")
	}

	const expMs = parseJwtExpMs(token)
	cachedTokensByEmail.set(email, { token, expiresAtMs: expMs, cachedAtMs: Date.now() })

	return { token }
}

function isCachedTokenUsable(cached: CachedToken, nowMs: number): boolean {
	if (cached.expiresAtMs) {
		return nowMs < cached.expiresAtMs - EXPIRY_SAFETY_WINDOW_MS
	}
	return nowMs < cached.cachedAtMs + FALLBACK_TTL_MS
}

export function invalidateDoconchainToken(email: string): void {
	const key = email.trim().toLowerCase()
	cachedTokensByEmail.delete(key)
}

export async function getDoconchainApiToken(input?: {
	email?: string
	forceGenerated?: boolean
}): Promise<string> {
	const explicit = env.DOCONCHAIN_API_TOKEN ?? env.DOCONCHAIN_USER_TOKEN
	if (explicit && !input?.forceGenerated) {
		return explicit
	}

	const email = (input?.email ?? env.DOCONCHAIN_EMAIL).trim().toLowerCase()
	if (!email) {
		throw new Error("DocOnChain token generation requires a non-empty email.")
	}

	const now = Date.now()
	const cached = cachedTokensByEmail.get(email)
	if (cached?.token && isCachedTokenUsable(cached, now)) {
		return cached.token
	}

	const existingInFlight = inFlightByEmail.get(email)
	if (existingInFlight) {
		return await existingInFlight
	}

	const promise = (async () => {
		try {
			const { token } = await generateDoconchainToken({ email })
			return token
		} finally {
			inFlightByEmail.delete(email)
		}
	})()

	inFlightByEmail.set(email, promise)
	return await promise
}

