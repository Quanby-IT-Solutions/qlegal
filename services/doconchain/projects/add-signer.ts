import { env } from "@/env"
import type { GetSubOrgCredsForEmail } from "@/services/doconchain/auth/generate-token"
import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

function splitName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim()
	if (!trimmed) return { firstName: "User", lastName: "User" }
	const parts = trimmed.split(/\s+/)
	if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! }
	return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

type AddSignerPayload = {
	email: string
	first_name: string
	last_name: string
	type: "GUEST"
	signer_role: "Signer" | "Approver" | "Viewer" | "Issuee"
}

async function postAddSigner(params: {
	projectUuid: string
	token: string
	payload: AddSignerPayload
}): Promise<unknown> {
	const url = new URL(`/projects/${params.projectUuid}/signers`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params.payload),
	})

	if (res.status === 409) {
		return { alreadyExists: true }
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "")
		// DocOnChain sometimes returns 400 with a JSON message when signer already exists.
		// Example: {"message":"The signer has already been added"}
		if (res.status === 400) {
			try {
				const parsed = JSON.parse(text) as { message?: string }
				const msg = (parsed.message ?? "").toLowerCase()
				if (msg.includes("already been added")) {
					return { alreadyExists: true }
				}
			} catch {
				// ignore parse errors; fall through to throwing
			}
		}
		const err = new Error(
			`DocOnChain add signer failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
		;(err as Error & { status?: number }).status = res.status
		throw err
	}

	return await res.json().catch(() => ({}))
}

export async function addDoconchainProjectSigner(input: {
	projectUuid: string
	enpEmail: string
	signer: {
		email: string
		name: string
		role: "Signer" | "Approver" | "Viewer" | "Issuee"
	}
	/** Optional: resolve sub-org enterprise creds for this ENP to avoid unauthorized parent-org token flows. */
	getSubOrgCredsForEmail?: GetSubOrgCredsForEmail
}): Promise<void> {
	const email = input.enpEmail.trim().toLowerCase()
	if (!email) throw new Error("ENP email is required to add DocOnChain signers.")

	const signerEmail = input.signer.email.trim().toLowerCase()
	if (!signerEmail) throw new Error("Signer email is required to add DocOnChain signers.")

	const { firstName, lastName } = splitName(input.signer.name)

	const payload: AddSignerPayload = {
		email: signerEmail,
		first_name: firstName,
		last_name: lastName,
		type: "GUEST",
		signer_role: input.signer.role,
	}

	const doRequest = async () => {
		const token = await getDoconchainApiToken({
			email,
			forceGenerated: true,
			getSubOrgCredsForEmail: input.getSubOrgCredsForEmail,
		})
		await postAddSigner({ projectUuid: input.projectUuid, token, payload })
	}

	try {
		await doRequest()
	} catch (error) {
		const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined
		if (status === 401) {
			invalidateDoconchainToken(email)
			await doRequest()
			return
		}
		throw error
	}
}

