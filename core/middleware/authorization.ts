import { DEFAULT_ROUTES, ROUTE_CONFIG } from "@/core/middleware/config"
import { matchesAnyRoute, matchesRoute } from "@/core/middleware/route-matcher"

import { type UserRole } from "@/services/drizzle/schema/auth"

// ============================================================================
// AUTHORIZATION LOGIC (Functional)
// ============================================================================

/**
 * Determines if a route is accessible for the given role
 */
export function isRouteAuthorized(path: string, role: UserRole | null): boolean {
	// Public routes are always accessible
	if (matchesAnyRoute(path, ROUTE_CONFIG.public)) {
		return true
	}

	// Public only routes are only accessible to non-authenticated users
	if (matchesAnyRoute(path, ROUTE_CONFIG.publicOnly)) {
		return !role
	}

	// Protected routes require authentication
	if (!role) {
		return false
	}

	// Check shared protected routes
	if (matchesAnyRoute(path, ROUTE_CONFIG.protected.shared)) {
		return true
	}

	// Check role-specific routes
	const roleRoutes = role ? (ROUTE_CONFIG.protected.byRole[role] ?? []) : []
	if (matchesAnyRoute(path, roleRoutes)) {
		return true
	}

	// Admin has access to all protected routes
	if (role === "admin") {
		return Object.values(ROUTE_CONFIG.protected.byRole)
			.flat()
			.some(pattern => matchesRoute(path, pattern))
	}

	return false
}

/**
 * Gets the default redirect route for a role
 */
export function getDefaultRoute(role: UserRole): string {
	return DEFAULT_ROUTES[role] ?? "/dashboard"
}
