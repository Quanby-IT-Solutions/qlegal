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

interface Witness {
	witnessName: string
	witnessAddress: PrincipalAddress
}

interface Metadata {
	dateNotarized: string // YYYY-MM-DD format
	notarialActType: "Acknowledgment" | "Affirmation" | "Jurat" | "Signature Witnessing" | "Copy Certification"
	notarialPageNumber: number
	notarialBookNumber: number
	description: string
	modeOfNotarization: "In-person" | "Remote"
	remarks?: string
	dateUpdated?: string // YYYY-MM-DD format
}

interface CreateMetadataRequest {
	notaryFacilityNumber: string // NFN
	notaryPublicNumber: string // NPN
	rollNumber: string // RN
	metaData: Metadata
	listOfPrincipals?: Principal[]
	listOfWitness?: Witness[]
}

interface CreateMetadataResponse {
	message: string
	notarialRegistryID: string // NRID
	notarialRegistryNumber: string // NRN
}

/**
 * Create Electronic Notarial Document – Metadata (Consolidated).
 * Endpoint: POST /public-use/consolidated (doc v1.4 – consolidated path)
 *
 * Creates metadata, principals, and witnesses in one call.
 */
export async function createMetadata(
	request: CreateMetadataRequest
): Promise<CreateMetadataResponse> {
	const response = await post("/public-use/consolidated", request)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Supreme Court metadata creation failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as CreateMetadataResponse
	return data
}
