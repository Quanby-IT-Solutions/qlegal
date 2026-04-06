 
import { type UserRole } from "@/services/drizzle/schema/auth"

import { env } from "@/env"

// ============================================================================
// LOGGING & MONITORING (Functional)
// ============================================================================

/**
 * Logs middleware access attempts
 */
export function logAccess(path: string, role: UserRole | null, authorized: boolean): void {
	if (env.NODE_ENV === "development") {
		console.log(`\n[Middleware] ${path} | Role: ${role ?? "anonymous"} | Authorized: ${authorized}`)
	}
}

/**
 * Logs redirect actions
 */
export function logRedirect(from: string, to: string, reason: string): void {
	if (env.NODE_ENV === "development") {
		console.log(`[Middleware] Redirect: ${from} -> ${to} (${reason})`)
	}
}

/**
 * Logs errors with context
 */
export function logError(error: unknown, context?: string): void {
	const contextInfo = context ? `[${context}] ` : ""
	console.error(`[Middleware] ${contextInfo}Error:`, error)
}
