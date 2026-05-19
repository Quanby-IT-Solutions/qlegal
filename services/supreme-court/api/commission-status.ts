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
 * SC only uses NPN to look up commission status; rn is required by the API
 * contract but its value is not validated against the NPN.
 *
 * @param npn - Notary Public Number (e.g. "NPN-2025-00020")
 * @param rn - Roll Number sent for API contract compliance (e.g. "RN-12341")
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
		const err = new Error(errorMessage)
		;(err as Error & { status?: number }).status = response.status

		// Handle documented error codes per PDF specification
		// PDF documents: 400, 401, 404, 500

		if (response.status === 400) {
			err.message =
				`${errorMessage}\n\n` +
				`⚠️ Bad Request (400): Invalid input data\n` +
				`   - Check that NPN and RN values are valid\n` +
				`   - Verify the format is correct (e.g., "NPN-2" or "2")\n` +
				`   - Ensure the notary exists in the Supreme Court system`
			throw err
		}

		if (response.status === 401) {
			err.message =
				`${errorMessage}\n\n` +
				`⚠️ Unauthorized (401): Missing or invalid token\n` +
				`   - Verify your Cognito credentials are correct\n` +
				`   - Check that the access token is valid and not expired`
			throw err
		}

		if (response.status === 404) {
			err.message =
				`${errorMessage}\n\n` +
				`⚠️ Not Found (404): Task not found\n` +
				`   - Verify the endpoint URL is correct\n` +
				`   - Check that the NPN/RN combination exists`
			throw err
		}

		if (response.status === 500) {
			err.message =
				`${errorMessage}\n\n` +
				`⚠️ Internal Server Error (500): Something went wrong on the server\n` +
				`   - This is a server-side issue\n` +
				`   - Contact Supreme Court API administrators if this persists`
			throw err
		}

		throw err
	}

	const data = (await response.json()) as CommissionStatusResponse
	return data
}
