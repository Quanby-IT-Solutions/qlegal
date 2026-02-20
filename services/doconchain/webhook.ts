import crypto from "crypto"

export type DoconchainWebhookInterpretation =
	| {
			ok: true
			projectUuid: string
			signerEmail: string | null
			action: "SIGNED" | "DECLINED" | "UNKNOWN"
			rawEvent: string | null
	  }
	| { ok: false; reason: string }

export function timingSafeEqualString(a: string, b: string): boolean {
	const aBuf = Buffer.from(a, "utf8")
	const bBuf = Buffer.from(b, "utf8")
	// timingSafeEqual requires same length
	if (aBuf.length !== bBuf.length) return false
	return crypto.timingSafeEqual(aBuf, bBuf)
}

function asNonEmptyString(v: unknown): string | null {
	if (typeof v !== "string") return null
	const t = v.trim()
	return t ? t : null
}

function pickFirstByPaths(payload: unknown, paths: string[]): string | null {
	if (!payload || typeof payload !== "object") return null
	let cur: unknown = payload
	for (const p of paths) {
		if (!cur || typeof cur !== "object") return null
		const rec = cur as Record<string, unknown>
		cur = rec[p]
	}
	return asNonEmptyString(cur)
}

function findFirstStringDeep(payload: unknown, predicate: (value: string) => boolean): string | null {
	if (typeof payload === "string") return predicate(payload) ? payload.trim() : null
	if (!payload || typeof payload !== "object") return null
	if (Array.isArray(payload)) {
		for (const item of payload) {
			const found = findFirstStringDeep(item, predicate)
			if (found) return found
		}
		return null
	}
	for (const v of Object.values(payload as Record<string, unknown>)) {
		const found = findFirstStringDeep(v, predicate)
		if (found) return found
	}
	return null
}

export function redactDoconchainUrlForLog(urlString: string): string {
	try {
		const url = new URL(urlString)
		for (const key of ["token", "api_token", "signature", "sig", "secret"]) {
			if (url.searchParams.has(key)) url.searchParams.set(key, "***")
		}
		if (url.searchParams.has("email")) url.searchParams.set("email", "***")
		return url.toString()
	} catch {
		return urlString
	}
}

export function sanitizeWebhookPayloadForLog(payload: unknown): unknown {
	if (typeof payload === "string") {
		return payload.length > 300 ? `${payload.slice(0, 300)}…` : payload
	}
	if (!payload || typeof payload !== "object") return payload
	if (Array.isArray(payload)) return payload.map(v => sanitizeWebhookPayloadForLog(v))
	const rec = payload as Record<string, unknown>
	const out: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(rec)) {
		if (k.toLowerCase().includes("token") || k.toLowerCase().includes("secret")) {
			out[k] = "***"
			continue
		}
		if (typeof v === "string" && /^https?:\/\//i.test(v)) {
			out[k] = redactDoconchainUrlForLog(v)
			continue
		}
		out[k] = sanitizeWebhookPayloadForLog(v)
	}
	return out
}

export function interpretDoconchainWebhook(payload: unknown): DoconchainWebhookInterpretation {
	// Event/type naming varies between providers; try common fields.
	const rawEvent =
		asNonEmptyString((payload as Record<string, unknown> | null)?.event) ??
		asNonEmptyString((payload as Record<string, unknown> | null)?.type) ??
		asNonEmptyString((payload as Record<string, unknown> | null)?.action) ??
		null

	// Project UUID: we store this as documents.docoChainProjectId
	const projectUuid =
		pickFirstByPaths(payload, ["projectUuid"]) ??
		pickFirstByPaths(payload, ["project_uuid"]) ??
		pickFirstByPaths(payload, ["project", "uuid"]) ??
		pickFirstByPaths(payload, ["data", "project_uuid"]) ??
		pickFirstByPaths(payload, ["data", "projectUuid"]) ??
		pickFirstByPaths(payload, ["data", "project", "uuid"]) ??
		pickFirstByPaths(payload, ["uuid"]) ??
		findFirstStringDeep(payload, v => /^[A-Za-z0-9_-]{8,}$/.test(v.trim())) ??
		null

	if (!projectUuid) {
		return { ok: false, reason: "Missing project UUID in webhook payload." }
	}

	// Signer email (best-effort; some events might not include it)
	const signerEmail =
		pickFirstByPaths(payload, ["signerEmail"]) ??
		pickFirstByPaths(payload, ["signer_email"]) ??
		pickFirstByPaths(payload, ["signer", "email"]) ??
		pickFirstByPaths(payload, ["user", "email"]) ??
		pickFirstByPaths(payload, ["email"]) ??
		pickFirstByPaths(payload, ["data", "email"]) ??
		pickFirstByPaths(payload, ["data", "signer_email"]) ??
		pickFirstByPaths(payload, ["data", "signer", "email"]) ??
		findFirstStringDeep(payload, v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) ??
		null

	const rawStatus =
		asNonEmptyString((payload as Record<string, unknown> | null)?.status) ??
		pickFirstByPaths(payload, ["data", "status"]) ??
		null

	const haystack = `${rawEvent ?? ""} ${rawStatus ?? ""}`.toLowerCase()
	const action: "SIGNED" | "DECLINED" | "UNKNOWN" =
		haystack.includes("declin") || haystack.includes("reject") || haystack.includes("void")
			? "DECLINED"
			: haystack.includes("sign") || haystack.includes("complete") || haystack.includes("approved")
				? "SIGNED"
				: "UNKNOWN"

	return { ok: true, projectUuid, signerEmail, action, rawEvent }
}

