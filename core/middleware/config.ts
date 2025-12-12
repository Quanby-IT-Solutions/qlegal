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
		{ path: "/auth/legal-registration", exact: true },
	],

	// Protected routes - require authentication and role-based access
	protected: {
		shared: [
			{ path: "/auth/signature" },
			{ path: "/auth/kyc", exact: true },
			{ path: "/documents" },
			{ path: "/documents/completed" },
			{ path: "/documents/create" },
			{ path: "/documents/pending" },
			{ path: "/documents/templates" },
			{ path: "/envelope" },
			{ path: "/envelopes" },
			{ path: "/find-a-lawyer" },
			{ path: "/find-notary" },
			{ path: "/kyc" },
			{ path: "/meetings" },
			{ path: "/messages" },
			{ path: "/my-signed" },
			{ path: "/notarizations/active" },
			{ path: "/notarizations/history" },
			{ path: "/notarize" },
			{ path: "/notifications" },
			{ path: "/profile" },
			{ path: "/requests" },
			{ path: "/requests/incoming" },
			{ path: "/requests/my-requests" },
			{ path: "/scan" },
			{ path: "/settings" },
			{ path: "/verification" },
			{ path: "/notarial-book" },
		],
		byRole: {
			ENP: [{ path: "/dashboard" }],
			PRINCIPAL: [{ path: "/dashboard" }, { path: "/consultations" }],
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
