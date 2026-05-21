import { post } from "@/services/supreme-court/lib/http-client"
import { decodeToken, getCachedToken } from "@/services/supreme-court/lib/token-cache"

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
	notarialActType:
		| "Acknowledgment"
		| "Affirmation"
		| "Jurat"
		| "Signature Witnessing"
		| "Copy Certification"
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
 * Create Electronic Notarial Document – Metadata.
 * Endpoint: POST /public-use/metadata
 *
 * Request: notaryFacilityNumber, notaryPublicNumber, rollNumber, metaData
 * Response: message, notarialRegistryID (NRID), notarialRegistryNumber (NRN)
 */
export async function createMetadata(
	request: CreateMetadataRequest
): Promise<CreateMetadataResponse> {
	const body = {
		notaryFacilityNumber: request.notaryFacilityNumber,
		notaryPublicNumber: request.notaryPublicNumber,
		rollNumber: request.rollNumber,
		metaData: request.metaData,
	}
	const response = await post("/public-use/metadata", body)

	if (!response.ok) {
		const errorText = await response.text()
		const errorMessage = `Supreme Court metadata creation failed: ${response.status} - ${errorText}`

		// Handle documented error codes per PDF specification
		// PDF documents: 400, 401, 404, 500
		// Note: 403 is not documented but occurs in practice (AWS API Gateway IAM policy deny)

		if (response.status === 400) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Bad Request (400): Invalid input data\n` +
					`   - Check that NPN, NFN, and RN values are valid and registered in the Supreme Court system\n` +
					`   - Verify all required fields are provided and in the correct format\n` +
					`   - Ensure commission status is "Active" (use real credentials, not test values)`
			)
		}

		if (response.status === 401) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Unauthorized (401): Missing or invalid token\n` +
					`   - Verify your Cognito credentials are correct\n` +
					`   - Check that the access token is valid and not expired\n` +
					`   - Ensure authentication was successful`
			)
		}

		if (response.status === 404) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Not Found (404): Task not found\n` +
					`   - Verify the endpoint URL is correct\n` +
					`   - Check that the resource exists`
			)
		}

		if (response.status === 500) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Internal Server Error (500): Something went wrong on the server\n` +
					`   - This is a server-side issue\n` +
					`   - Contact Supreme Court API administrators if this persists`
			)
		}

		// Handle 403 (not documented in PDF but occurs in practice)
		// AWS API Gateway returns 403 when IAM policies explicitly deny access
		if (response.status === 403) {
			// Decode token to show user's groups for debugging
			const token = getCachedToken()
			let groupInfo = ""
			if (token) {
				const decoded = decodeToken(token)
				if (decoded.groups && decoded.groups.length > 0) {
					groupInfo = `\n   - Current Cognito groups: ${decoded.groups.join(", ")}`
				}
				if (decoded.username) {
					groupInfo += `\n   - Username: ${decoded.username}`
				}
			}

			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Forbidden (403): Access denied by IAM policy${groupInfo}\n` +
					`   - Note: 403 is not documented in PDF but occurs when AWS API Gateway IAM policies deny access\n` +
					`   - The "API-Guest" group typically only has read-only access\n` +
					`   - Contact Supreme Court API administrators to:\n` +
					`     • Request access to POST /public-use/metadata endpoint\n` +
					`     • Ask to be added to a group with write permissions (e.g., "API-User" or "API-Write")\n` +
					`   - Ensure your IAM policy allows access to this resource`
			)
		}

		// Generic error for any other status codes
		throw new Error(errorMessage)
	}

	const data = (await response.json()) as CreateMetadataResponse
	return data
}

/**
 * Create Electronic Notarial Document – Metadata (Consolidated).
 * Endpoint: POST /public-use/consolidated
 *
 * Creates metadata, principals, and witnesses in one call.
 * Request: notaryFacilityNumber, notaryPublicNumber, rollNumber, metaData, listOfPrincipals, listOfWitness
 * Response: message, notarialRegistryID (NRID), notarialRegistryNumber (NRN)
 */
export async function createMetadataConsolidated(
	request: CreateMetadataRequest
): Promise<CreateMetadataResponse> {
	const response = await post("/public-use/consolidated", request)

	if (!response.ok) {
		const errorText = await response.text()
		const base = `Supreme Court consolidated metadata creation failed: ${response.status} - ${errorText}`

		// Provide the same guidance as createMetadata(), since consolidated uses the same validations.
		if (response.status === 400) {
			throw new Error(
				`${base}\n\n` +
					`⚠️ Bad Request (400): The Supreme Court API rejected the payload.\n` +
					`   Common causes:\n` +
					`   - NPN/NFN/RN are invalid, not registered, or not in the expected format\n` +
					`   - Commission or accreditation status is not Active (SC will reject)\n` +
					`   - metaData fields are invalid (dateNotarized must be YYYY-MM-DD, act type must match allowed values)\n` +
					`   - principal/witness fields missing required data\n\n` +
					`   Sent identifiers:\n` +
					`   - NFN: ${request.notaryFacilityNumber}\n` +
					`   - NPN: ${request.notaryPublicNumber}\n` +
					`   - RN: ${request.rollNumber}`
			)
		}

		if (response.status === 401) {
			throw new Error(
				`${base}\n\n` +
					`⚠️ Unauthorized (401): Missing or invalid token\n` +
					`   - Verify Supreme Court API authentication is configured correctly\n` +
					`   - Re-authenticate and retry`
			)
		}

		if (response.status === 403) {
			throw new Error(
				`${base}\n\n` +
					`⚠️ Forbidden (403): Access denied\n` +
					`   - Your Supreme Court API account/group may not have write access to /public-use/consolidated\n` +
					`   - Contact Supreme Court API administrators to request write permissions`
			)
		}

		if (response.status === 404) {
			throw new Error(
				`${base}\n\n` +
					`⚠️ Not Found (404): Endpoint not found\n` +
					`   - Verify the SC API base URL and endpoint path`
			)
		}

		if (response.status === 500) {
			throw new Error(
				`${base}\n\n` +
					`⚠️ Internal Server Error (500): Supreme Court API error\n` +
					`   - Retry later; if persistent, contact SC API administrators`
			)
		}

		throw new Error(base)
	}

	const data = (await response.json()) as CreateMetadataResponse
	return data
}
