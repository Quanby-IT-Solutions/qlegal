import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"

import { env } from "@/env"

type CreateSubOrganizationResponse = {
	id?: string
	uuid?: string
	name?: string
	address?: string
	photo_url?: string
	sub_organization_type_name?: string
	organization_uuid?: string
	created_at?: string
	data?: {
		client_key?: string
		client_secret?: string
		id?: string
		uuid?: string
		name?: string
		address?: string
		photo_url?: string
		created_at?: string
		/** DocOnChain actual shape: data.sub_org_data */
		sub_org_data?: {
			id?: number
			uuid?: string
			name?: string
			address?: string
			created_at?: string
			photo?: string
		}
	}
}

export async function createDoconchainSubOrganization(input: {
	name: string
	address: string
	subOrganizationTypeName?: string
	photo?: Blob | Buffer
	photoFilename?: string
}): Promise<{
	id: string
	name: string
	subOrgNumericId?: number
	clientKey: string | null
	clientSecret: string | null
	raw: CreateSubOrganizationResponse
}> {
	const name = input.name.trim()
	const address = input.address.trim()
	if (!name || !address) {
		throw new Error("DocOnChain create sub-organization requires name and address.")
	}

	// Create Sub Org endpoint requires parent organization_uuid (UUID format), not numeric ID.
	const parentUuid = (env.DOCONCHAIN_ORGANIZATION_UUID ?? "").trim()
	if (!parentUuid) {
		throw new Error(
			"DocOnChain create sub-organization requires DOCONCHAIN_ORGANIZATION_UUID (parent org UUID). The API does not accept numeric ID."
		)
	}

	const url = new URL("/api/v2/organizations/sub", env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const buildBody = (): FormData => {
		const form = new FormData()
		form.set("name", name)
		form.set("address", address)
		form.set("sub_organization_type_name", input.subOrganizationTypeName ?? "Department")
		form.set("organization_uuid", parentUuid)
		if (input.photo) {
			const blob =
				input.photo instanceof Blob
					? input.photo
					: new Blob([new Uint8Array(input.photo)], { type: "image/png" })
			form.append("photo", blob, input.photoFilename ?? "logo.png")
		}
		return form
	}

	const doRequest = async (token: string, bodyOverride?: FormData): Promise<Response> => {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 90_000)
		try {
			return await fetch(url.toString(), {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: bodyOverride ?? buildBody(),
				signal: controller.signal,
			})
		} catch (err) {
			clearTimeout(timeoutId)
			if (err instanceof Error && err.name === "AbortError") {
				throw new Error(
					"DocOnChain create sub-organization timed out (90s). The DocOnChain API may be slow; try again."
				)
			}
			throw err
		} finally {
			clearTimeout(timeoutId)
		}
	}

	const isGatewayError = (r: Response) => r.status === 502 || r.status === 503 || r.status === 504

	// Always generate a fresh admin token for create-sub-org to avoid expired tokens.
	invalidateDoconchainToken(env.DOCONCHAIN_EMAIL)
	let token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
	let res = await doRequest(token)
	if (res.status === 401) {
		token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL, forceGenerated: true })
		res = await doRequest(token)
	}
	// On 502/503/504, retry once without photo so the request is smaller and more likely to complete.
	if (isGatewayError(res)) {
		await new Promise(r => setTimeout(r, 2000))
		const retryBody = new FormData()
		retryBody.set("name", name)
		retryBody.set("address", address)
		retryBody.set("sub_organization_type_name", input.subOrganizationTypeName ?? "Department")
		retryBody.set("organization_uuid", parentUuid)
		res = await doRequest(token, retryBody)
	}

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain create sub-organization failed (${res.status} ${res.statusText})${text ? `: ${text}` : ""}`
		)
	}

	const raw = text
		? (JSON.parse(text) as CreateSubOrganizationResponse)
		: ({} as CreateSubOrganizationResponse)
	// DocOnChain returns { message, data: { sub_org_data: { uuid, id, name, ... } } }
	const sub = raw.data?.sub_org_data
	const id =
		sub?.uuid ??
		(sub !== undefined && sub.id !== null ? String(sub.id) : null) ??
		raw.id ??
		raw.uuid ??
		raw.data?.id ??
		raw.data?.uuid
	const resolvedName = sub?.name ?? raw.name ?? raw.data?.name ?? name
	const clientKey = (raw.data?.client_key ?? "").trim() || null
	const clientSecret = (raw.data?.client_secret ?? "").trim() || null
	if (!id) {
		throw new Error(
			`DocOnChain create sub-organization response missing id. Response: ${text ? text.slice(0, 500) : "empty"}`
		)
	}
	return {
		id: String(id),
		name: resolvedName,
		subOrgNumericId: sub?.id,
		clientKey,
		clientSecret,
		raw,
	}
}
