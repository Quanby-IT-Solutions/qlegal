import { post } from "@/services/supreme-court/lib/http-client"

interface PrincipalAddress {
	homeStreet: string
	barangay: string
	cityProvince: string
}

interface Principal {
	principalName: string
	principalAddress: PrincipalAddress
}

interface CreatePrincipalsRequest {
	notarialRegistryID: string
	listOfPrincipals: Principal[]
}

interface CreatePrincipalsResponse {
	message: string
}

/**
 * Create List of Notarial Principals.
 * Endpoint: POST /public-use/principal
 *
 * Use this if you didn't include principals in the consolidated metadata endpoint.
 */
export async function createPrincipals(
	notarialRegistryID: string,
	principals: Principal[]
): Promise<CreatePrincipalsResponse> {
	const body: CreatePrincipalsRequest = {
		notarialRegistryID,
		listOfPrincipals: principals,
	}
	const response = await post("/public-use/principal", body)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Supreme Court principals creation failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as CreatePrincipalsResponse
	return data
}
