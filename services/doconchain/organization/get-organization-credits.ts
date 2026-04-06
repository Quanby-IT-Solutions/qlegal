import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

type OrgCreditsRow = {
	id?: number | string
	uuid?: string
	name?: string
	allocated_credits?: number
	remaining_credits?: number
	used_credits?: number
	[key: string]: unknown
}

type OrgCreditsResponse =
	| {
			total_credits?: number
			used_credits?: number
			remaining_credits?: number
			message?: string
			data?: OrgCreditsRow[]
			meta?: unknown
	  }
	| OrgCreditsRow[]

function asCreditsArray(parsed: OrgCreditsResponse): OrgCreditsRow[] {
	if (Array.isArray(parsed)) return parsed
	if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
		return parsed.data
	}
	// DocOnChain docs: GET /organizations/credits returns flat shape with no data array.
	// Treat top-level total_credits/remaining_credits as a single "main org" row so callers can use it.
	const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
	if (obj && (typeof (obj as OrgCreditsRow).remaining_credits === "number" || typeof (obj as OrgCreditsRow).total_credits === "number")) {
		return [{ ...(obj as OrgCreditsRow) }]
	}
	return []
}

export async function getDoconchainOrganizationCredits(): Promise<{
	summary: { totalCredits: number | null; usedCredits: number | null; remainingCredits: number | null }
	items: OrgCreditsRow[]
	raw: OrgCreditsResponse | null
}> {
	const url = new URL("/api/v2/organizations/credits", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	const res = await fetch(url.toString(), {
		method: "GET",
		headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain get organization credits failed (${res.status} ${res.statusText})${
				text ? `: ${text.slice(0, 300)}` : ""
			}`
		)
	}

	const raw = (text ? (JSON.parse(text) as OrgCreditsResponse) : null)
	const items = raw ? asCreditsArray(raw) : []

	const top = raw && !Array.isArray(raw) && typeof raw === "object" ? raw : {}
	const summary = {
		totalCredits:
			typeof (top as { total_credits?: unknown }).total_credits === "number"
				? (top as { total_credits: number }).total_credits
				: null,
		usedCredits:
			typeof (top as { used_credits?: unknown }).used_credits === "number"
				? (top as { used_credits: number }).used_credits
				: null,
		remainingCredits:
			typeof (top as { remaining_credits?: unknown }).remaining_credits === "number"
				? (top as { remaining_credits: number }).remaining_credits
				: null,
	}

	return { summary, items, raw }
}

