import { env } from "@/env"
import { getDoconchainApiToken } from "@/services/doconchain/auth/generate-token"

type UpdateSubOrgResponse = {
	success?: boolean
	message?: string
	data?: {
		uuid?: string
		name?: string
		email?: string
		address?: string
		photo_url?: string
		sub_organization_type_name?: string
	}
}

export async function updateDoconchainSubOrganization(input: {
	uuid: string
	name: string
	email: string
	address: string
	subOrganizationTypeName: string
	photo?: Blob | Buffer
	photoFilename?: string
}): Promise<{
	success: boolean
	uuid: string
	name: string
	email: string
	address: string
	photoUrl: string | null
	subOrganizationTypeName: string | null
	raw: UpdateSubOrgResponse
}> {
	const uuid = input.uuid.trim()
	if (!uuid) {
		throw new Error("DocOnChain update sub-organization requires uuid.")
	}

	const name = input.name.trim()
	const email = input.email.trim()
	const address = input.address.trim()
	const typeName = input.subOrganizationTypeName.trim() || "Department"

	if (!name || !email || !address) {
		throw new Error("DocOnChain update sub-organization requires name, email, and address.")
	}

	const url = new URL(`/api/v2/organizations/sub/${uuid}`, env.DOCONCHAIN_API_URL)
	url.searchParams.set("user_type", "ENTERPRISE_API")

	const buildBody = (): FormData => {
		const form = new FormData()
		form.set("name", name)
		form.set("email", email)
		form.set("address", address)
		form.set("sub_organization_type_name", typeName)

		if (input.photo) {
			const blob =
				input.photo instanceof Blob
					? input.photo
					: new Blob([new Uint8Array(input.photo)], { type: "image/png" })
			form.set("photo", blob, input.photoFilename ?? "logo.png")
		}
		return form
	}

	const token = await getDoconchainApiToken({ email: env.DOCONCHAIN_EMAIL })
	const res = await fetch(url.toString(), {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: buildBody(),
	})

	const text = await res.text().catch(() => "")
	if (!res.ok) {
		throw new Error(
			`DocOnChain update sub-organization failed (${res.status} ${res.statusText})${
				text ? `: ${text.slice(0, 500)}` : ""
			}`
		)
	}

	const raw = (text ? (JSON.parse(text) as UpdateSubOrgResponse) : {})
	const success =
		raw.success === true ||
		typeof raw.message === "string" && raw.message.toLowerCase().includes("success")

	const data = raw.data ?? {}

	return {
		success,
		uuid: (data.uuid ?? uuid),
		name: (data.name ?? name),
		email: (data.email ?? email),
		address: (data.address ?? address),
		photoUrl: (data.photo_url ?? null) ?? null,
		subOrganizationTypeName: (data.sub_organization_type_name ?? typeName) ?? null,
		raw,
	}
}

