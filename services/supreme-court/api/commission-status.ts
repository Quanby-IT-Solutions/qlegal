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
		throw new Error(
			`Supreme Court commission status failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as CommissionStatusResponse
	return data
}
