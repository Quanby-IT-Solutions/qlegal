import { type NextResponse } from "next/server"

import { CUSTOM_HEADERS } from "@/core/middleware/config"

// ============================================================================
// SECURITY UTILITIES (Functional)
// ============================================================================

/**
 * Adds custom headers to the response
 * Note: Next.js 15 automatically handles most security headers
 */
export function addCustomHeaders(
	response: NextResponse,
	userId?: string,
	currentPath?: string
): NextResponse {
	// Add custom headers not handled by Next.js 15
	Object.entries(CUSTOM_HEADERS).forEach(([key, value]) => {
		response.headers.set(key, value as string)
	})

	// Add user ID header for authenticated requests
	if (userId) {
		response.headers.set("X-User-ID", userId)
	}

	// Add current path header
	if (currentPath) {
		response.headers.set("x-current-path", currentPath)
	}

	return response
}
