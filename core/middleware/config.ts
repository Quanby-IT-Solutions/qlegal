import { type UserRole } from "@/services/drizzle/schema/auth"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export interface RoutePattern {
	path: string
	exact?: boolean
}

export interface RouteConfig {
	public: RoutePattern[]
	publicOnly: RoutePattern[]
	protected: {
		shared: RoutePattern[]
		byRole: Record<UserRole, RoutePattern[]>
	}
}

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

export const ROUTE_CONFIG: RouteConfig = {
	public: [{ path: "/", exact: true }, { path: "/test" }],

	// Public only routes - accessible to non-authenticated users only
	publicOnly: [
		{ path: "/auth/error", exact: true },
		{ path: "/auth/forgot-password", exact: true },
		{ path: "/auth/login", exact: true },
		{ path: "/auth/register", exact: true },
		{ path: "/auth/reset-password", exact: true },
		{ path: "/auth/verify-email", exact: true },
	],

	// Protected routes - require authentication and role-based access
	protected: {
		shared: [
			{ path: "/auth/signature" },
			{ path: "/envelope" },
			{ path: "/envelopes" },
			{ path: "/meetings" },
			{ path: "/messages" },
			{ path: "/my-signed" },
			{ path: "/notifications" },
			{ path: "/profile" },
			{ path: "/settings" },
		],
		byRole: {
			ENP: [{ path: "/dashboard" }],
			PRINCIPAL: [{ path: "/dashboard" }],
			ENA: [{ path: "/dashboard" }],
			ADMIN: [{ path: "/dashboard" }],
		},
	},
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CUSTOM_HEADERS = {} as const

export const DEFAULT_ROUTES: Record<UserRole, string> = {
	ENP: "/dashboard",
	PRINCIPAL: "/dashboard",
	ENA: "/dashboard",
	ADMIN: "/dashboard",
}
