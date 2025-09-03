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
	public: [{ path: "/", exact: true }],

	// Public only routes - accessible to non-authenticated users only
	publicOnly: [
		{ path: "/auth/login", exact: true },
		{ path: "/auth/register", exact: true },
		{ path: "/auth/forgot-password", exact: true },
		{ path: "/auth/reset-password", exact: true },
		{ path: "/auth/verify-email", exact: true },
	],

	// Protected routes - require authentication and role-based access
	protected: {
		shared: [
			{ path: "/profile" },
			{ path: "/notifications" },
			{ path: "/settings" },
			{ path: "/envelopes" },
			{ path: "/envelope" },
			{ path: "/my-signed" },
			{ path: "/auth/signature" },
		],
		byRole: {
			client: [],
			admin: [{ path: "/dashboard" }],
			super_admin: [{ path: "/dashboard" }],
		},
	},
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CUSTOM_HEADERS = {} as const

export const DEFAULT_ROUTES: Record<UserRole, string> = {
	client: "/",
	admin: "/",
	super_admin: "/",
}
