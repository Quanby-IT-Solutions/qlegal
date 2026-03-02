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
	public: [
		{ path: "/test" },
		{ path: "/liveness-validation" }, // Testing route for liveness validation
		{ path: "/auth/privacy-policy", exact: true },
		{ path: "/auth/terms-of-service", exact: true },
		{ path: "/preview-email" },
	],

	// Public only routes - accessible to non-authenticated users only
	publicOnly: [
		{ path: "/auth/error", exact: true },
		{ path: "/auth/forgot-password", exact: true },
		{ path: "/auth/login", exact: true },
		{ path: "/auth/register", exact: true },
		{ path: "/auth/register/lawyer", exact: true },
		{ path: "/auth/reset-password", exact: true },
		{ path: "/auth/verify-email", exact: true },
		{ path: "/auth/legal-registration", exact: true },
	],

	// Protected routes - require authentication and role-based access
	protected: {
		shared: [
			{ path: "/auth/kyc", exact: true },
			{ path: "/auth/signature" },
			{ path: "/auth/status", exact: true },
			{ path: "/appointments" },
			{ path: "/browse" },
			{ path: "/calendar" },
			{ path: "/documents" },
			{ path: "/documents/completed" },
			{ path: "/documents/create" },
			{ path: "/documents/pending" },
			{ path: "/documents/templates" },
			{ path: "/envelope" },
			{ path: "/envelopes" },
			{ path: "/kyc" },
			{ path: "/liveness" },
			{ path: "/sessions" },
			{ path: "/messages" },
			{ path: "/notarial-book" },
			{ path: "/notarial-registry" },
			{ path: "/notarizations" },
			{ path: "/notarizations/active" },
			{ path: "/notarizations/history" },
			{ path: "/notarize" },
			{ path: "/notifications" },
			{ path: "/profile" },
			{ path: "/requests" },
			{ path: "/requests/incoming" },
			{ path: "/schedule" },
			{ path: "/settings" },
		],
		byRole: {
			ENP: [{ path: "/dashboard" }, { path: "/requests" }],
			PRINCIPAL: [{ path: "/dashboard" }, { path: "/consultations" }],
			ENA: [{ path: "/dashboard" }, { path: "/management/sub-orgs" }],
			ADMIN: [{ path: "/dashboard" }, { path: "/management/users" }, { path: "/management/sub-orgs" }],
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
