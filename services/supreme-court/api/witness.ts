import { post } from "@/services/supreme-court/lib/http-client"
import { decodeToken, getCachedToken } from "@/services/supreme-court/lib/token-cache"

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
 * Call after metadata creation. Requires notarialRegistryID (NRID) from metadata response.
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
		const errorMessage = `Supreme Court witnesses creation failed: ${response.status} - ${errorText}`

		// Handle documented error codes per PDF specification
		// PDF documents: 400, 401, 404, 500
		// Note: 403 is not documented but occurs in practice (AWS API Gateway IAM policy deny)

		if (response.status === 400) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Bad Request (400): Invalid input data\n` +
					`   - Check that NRID is valid and exists\n` +
					`   - Verify all required fields are provided and in the correct format\n` +
					`   - Ensure witness addresses are properly formatted`
			)
		}

		if (response.status === 401) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Unauthorized (401): Missing or invalid token\n` +
					`   - Verify your Cognito credentials are correct\n` +
					`   - Check that the access token is valid and not expired`
			)
		}

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
					`   - Contact Supreme Court API administrators to request access to POST /public-use/witness`
			)
		}

		if (response.status === 404) {
			throw new Error(
				`${errorMessage}\n\n` +
					`⚠️ Not Found (404): Task not found\n` +
					`   - Verify the NRID exists and is valid\n` +
					`   - Ensure metadata was created successfully before adding witnesses`
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

		throw new Error(errorMessage)
	}

	const data = (await response.json()) as CreateWitnessesResponse
	return data
}
