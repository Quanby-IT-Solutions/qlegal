import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

const debugLogsEnabled = env.NODE_ENV !== "production"
const DOCONCHAIN_FETCH_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number
): Promise<Response> {
	const controller = new AbortController()
	const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeoutMs)
	try {
		return await fetch(url, { ...init, signal: controller.signal })
	} finally {
		clearTimeout(timeoutId)
	}
}

function looksLikeEmailAlreadyExistsInDoconchain(text: string): boolean {
	const t = text.toLowerCase()
	return (
		t.includes("already exist") ||
		t.includes("already exists") ||
		t.includes("cannot add an email") ||
		t.includes("email that already")
	)
}

function splitName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim()
	if (!trimmed) {
		return { firstName: "User", lastName: "User" }
	}

	const parts = trimmed.split(/\s+/)
	if (parts.length === 1) {
		return { firstName: parts[0]!, lastName: parts[0]! }
	}

	return {
		firstName: parts[0]!,
		lastName: parts.slice(1).join(" "),
	}
}

function nameFromEmail(email: string): string {
	const local = email.split("@")[0]?.trim()
	if (!local) return "User"
	return local.replace(/[._-]+/g, " ").trim() || "User"
}

export async function autoJoinMemberInDoconchainOrganization(input: {
	email: string
	name?: string
	role?: "Member" | "Admin"
	organizationIdOverride?: string
}): Promise<{ joined: boolean; alreadyMember: boolean }> {
	const email = input.email.trim().toLowerCase()
	if (!email) {
		throw new Error("DocOnChain auto-join requires a non-empty email.")
	}

	// Use an org/admin token to perform auto-join (cached when possible).
	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })

	const displayName = (input.name ?? "").trim() || nameFromEmail(email)
	const { firstName, lastName } = splitName(displayName)

	const url = new URL("/api/v2/organization/members/auto-join", env.DOCONCHAIN_API_URL)

	const body = new FormData()
	body.set("data[0][email]", email)
	body.set("data[0][first_name]", firstName)
	body.set("data[0][last_name]", lastName)
	body.set("data[0][role]", input.role ?? "Member")
	body.set(
		"data[0][organization_id]",
		String((input.organizationIdOverride ?? "").trim() || env.DOCONCHAIN_ORGANIZATION_ID)
	)

	const startMs = Date.now()
	if (debugLogsEnabled) {
		console.log("[doconchain][auto-join] start", {
			email,
			url: url.toString(),
		})
	}

	let res: Response
	try {
		res = await fetchWithTimeout(
			url.toString(),
			{
				method: "POST",
				headers: {
					accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
				body,
			},
			DOCONCHAIN_FETCH_TIMEOUT_MS
		)
	} catch (error) {
		const isAbort = error instanceof Error && error.name === "AbortError"
		const msg = isAbort
			? `DocOnChain auto-join timed out after ${DOCONCHAIN_FETCH_TIMEOUT_MS}ms`
			: error instanceof Error
				? error.message
				: String(error)
		if (debugLogsEnabled) {
			console.log("[doconchain][auto-join] error", { email, message: msg, totalMs: Date.now() - startMs })
		}
		throw new Error(msg)
	}

	if (res.status === 401) {
		if (debugLogsEnabled) {
			console.log("[doconchain][auto-join] 401; retrying with forced token", {
				email,
				totalMs: Date.now() - startMs,
			})
		}
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		const retryStartMs = Date.now()
		let retryRes: Response
		try {
			retryRes = await fetchWithTimeout(
				url.toString(),
				{
					method: "POST",
					headers: {
						accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
					body,
				},
				DOCONCHAIN_FETCH_TIMEOUT_MS
			)
		} catch (error) {
			const isAbort = error instanceof Error && error.name === "AbortError"
			const msg = isAbort
				? `DocOnChain auto-join retry timed out after ${DOCONCHAIN_FETCH_TIMEOUT_MS}ms`
				: error instanceof Error
					? error.message
					: String(error)
			if (debugLogsEnabled) {
				console.log("[doconchain][auto-join] retry error", {
					email,
					message: msg,
					retryMs: Date.now() - retryStartMs,
					totalMs: Date.now() - startMs,
				})
			}
			throw new Error(msg)
		}

		// DocoChain returns 409 when the user already exists in the organization.
		if (retryRes.status === 409) {
			if (debugLogsEnabled) {
				console.log("[doconchain][auto-join] already member (409)", {
					email,
					totalMs: Date.now() - startMs,
				})
			}
			return { joined: false, alreadyMember: true }
		}

		if (!retryRes.ok) {
			const text = await retryRes.text().catch(() => "")
			// Some DocOnChain environments return 400 when the email already exists (either in this org or another org).
			// Treat as idempotent: caller can proceed to token generation / sub-org lookup.
			if (retryRes.status === 400 && looksLikeEmailAlreadyExistsInDoconchain(text)) {
				if (debugLogsEnabled) {
					console.log("[doconchain][auto-join] already member (400)", {
						email,
						totalMs: Date.now() - startMs,
					})
				}
				return { joined: false, alreadyMember: true }
			}
			throw new Error(
				`DocOnChain auto-join failed (${retryRes.status} ${retryRes.statusText})${text ? `: ${text}` : ""}`
			)
		}

		if (debugLogsEnabled) {
			console.log("[doconchain][auto-join] ok (retry)", { email, totalMs: Date.now() - startMs })
		}
		return { joined: true, alreadyMember: false }
	}

	// DocoChain returns 409 when the user already exists in the organization.
	if (res.status === 409) {
		if (debugLogsEnabled) {
			console.log("[doconchain][auto-join] already member (409)", {
				email,
				totalMs: Date.now() - startMs,
			})
		}
		return { joined: false, alreadyMember: true }
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		// Some DocOnChain environments return 400 when the email already exists (either in this org or another org).
		// Treat as idempotent: caller can proceed to token generation / sub-org lookup.
		if (res.status === 400 && looksLikeEmailAlreadyExistsInDoconchain(text)) {
			if (debugLogsEnabled) {
				console.log("[doconchain][auto-join] already member (400)", {
					email,
					totalMs: Date.now() - startMs,
				})
			}
			return { joined: false, alreadyMember: true }
		}
		throw new Error(
			`DocOnChain auto-join failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	if (debugLogsEnabled) {
		console.log("[doconchain][auto-join] ok", { email, totalMs: Date.now() - startMs })
	}
	return { joined: true, alreadyMember: false }
}

