import { env } from "@/env"

import { apiCall } from "../lib/http-client"
import { type Signer } from "../lib/schemas"
import { getProjectDetails } from "./project"

interface AddSignerParams {
	projectUuid: string
	email: string
	firstName: string
	lastName: string
	signerRole?: string
	userEmail?: string
}

export async function addSignerToProject({
	projectUuid,
	email,
	firstName,
	lastName,
	signerRole = "Signer",
	userEmail,
}: AddSignerParams): Promise<{ data?: Signer[]; message?: string; verified?: boolean }> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/projects/${projectUuid}/signers?user_type=ENTERPRISE_API`,
			{
				method: "POST",
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					email,
					first_name: firstName,
					last_name: lastName,
					type: "GUEST",
					signer_role: signerRole,
				}),
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()

		if (
			response.status === 400 &&
			(errorText.includes("already") || errorText.includes("already been added"))
		) {
			try {
				const projectDetails = await getProjectDetails(projectUuid, userEmail)
				const signers = (projectDetails?.data?.signers as Signer[]) ?? []
				const signerExists = signers.some(s => s.email === email)
				if (signerExists) {
					return { message: "Signer already exists", verified: true }
				}
			} catch {
				return { message: "Signer already exists", verified: true }
			}
		}

		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as Record<string, unknown>
}

interface DeleteSignerParams {
	projectUuid: string
	signerId: number
	userEmail?: string
}

export async function deleteSigner({
	projectUuid,
	signerId,
	userEmail,
}: DeleteSignerParams): Promise<void> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/projects/${projectUuid}/signers/${signerId}?user_type=ENTERPRISE_API`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			}
		)
	}, userEmail)

	if (!response.ok) {
		throw new Error(`doconchain API error: ${response.status} ${response.statusText}`)
	}
}

interface UpdateSignerParams {
	projectUuid: string
	signerId: string | number
	firstName: string
	lastName: string
	sequence: number
	signerRole: string
	userEmail?: string
}

export async function updateProjectSigner({
	projectUuid,
	signerId,
	firstName,
	lastName,
	sequence,
	signerRole,
	userEmail,
}: UpdateSignerParams): Promise<Record<string, unknown>> {
	const response = await apiCall(async token => {
		return fetch(
			`${env.DOCONCHAIN_API_URL}/projects/${projectUuid}/signers/${signerId}?user_type=ENTERPRISE_API`,
			{
				method: "PUT",
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					first_name: firstName,
					last_name: lastName,
					sequence,
					signer_role: signerRole,
				}),
			}
		)
	}, userEmail)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`doconchain API error: ${response.status} ${response.statusText} - ${errorText}`
		)
	}

	return (await response.json()) as Record<string, unknown>
}
