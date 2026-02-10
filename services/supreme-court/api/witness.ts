import { post } from "@/services/supreme-court/lib/http-client"

interface WitnessAddress {
	homeStreet: string
	barangay: string
	cityProvince: string
}

interface Witness {
	witnessName: string
	witnessAddress: WitnessAddress
}

interface CreateWitnessesRequest {
	notarialRegistryID: string
	listOfWitness: Witness[]
}

interface CreateWitnessesResponse {
	message: string
}

/**
 * Create List of Witnesses.
 * Endpoint: POST /public-use/witness
 *
 * Use this if you didn't include witnesses in the consolidated metadata endpoint.
 */
export async function createWitnesses(
	notarialRegistryID: string,
	witnesses: Witness[]
): Promise<CreateWitnessesResponse> {
	const body: CreateWitnessesRequest = {
		notarialRegistryID,
		listOfWitness: witnesses,
	}
	const response = await post("/public-use/witness", body)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Supreme Court witnesses creation failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as CreateWitnessesResponse
	return data
}
