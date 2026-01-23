import { generateToken, getToken, invalidateToken } from "./token-cache"

type ApiCallFn = (token: string) => Promise<Response>

export async function apiCall(fn: ApiCallFn, userEmail?: string): Promise<Response> {
	const token = await getToken(userEmail)
	let response = await fn(token)

	if (response.status === 401) {
		invalidateToken(userEmail)
		const newToken = await generateToken(userEmail, true)
		response = await fn(newToken)
	}

	return response
}
