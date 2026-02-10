import { post } from "@/services/supreme-court/lib/http-client"

interface CommissionStatusRequest {
	npn: string
	rn: string
}

interface CommissionStatusResponse {
	commissionStatus: string
}

/**
 * Get Notary Public Commission Status from Supreme Court eNotarization API.
 * Endpoint: POST /public-use/cs
 *
 * @param npn - Notary Public Number (e.g. "NPN-2" or "2")
 * @param rn - Roll Number (e.g. "RN-2" or "2")
 * @returns Commission status ("Active" or "Inactive")
 */
export async function getCommissionStatus(
	npn: string,
	rn: string
): Promise<CommissionStatusResponse> {
	const body: CommissionStatusRequest = { npn, rn }
	const response = await post("/public-use/cs", body)

	if (!response.ok) {
		const errorText = await response.text()
		const errorMessage = `Supreme Court commission status failed: ${response.status} - ${errorText}`
		
		// Handle documented error codes per PDF specification
		// PDF documents: 400, 401, 404, 500
		
		if (response.status === 400) {
			throw new Error(
				`${errorMessage}\n\n` +
				`⚠️ Bad Request (400): Invalid input data\n` +
				`   - Check that NPN and RN values are valid\n` +
				`   - Verify the format is correct (e.g., "NPN-2" or "2")\n` +
				`   - Ensure the notary exists in the Supreme Court system`
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
		
		if (response.status === 404) {
			throw new Error(
				`${errorMessage}\n\n` +
				`⚠️ Not Found (404): Task not found\n` +
				`   - Verify the endpoint URL is correct\n` +
				`   - Check that the NPN/RN combination exists`
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

	const data = (await response.json()) as CommissionStatusResponse
	return data
}
