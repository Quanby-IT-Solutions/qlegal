import { NextResponse } from "next/server"
import NextAuth from "next-auth"

import { getDefaultRoute, isRouteAuthorized } from "@/core/middleware/authorization"
import { ROUTE_CONFIG } from "@/core/middleware/config"
import { logAccess, logError, logRedirect } from "@/core/middleware/logger"
import { matchesAnyRoute } from "@/core/middleware/route-matcher"
import { addCustomHeaders } from "@/core/middleware/security"

import { authConfig } from "@/services/next-auth/config"

import { env } from "@/env"

const { auth: proxy } = NextAuth(authConfig)

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================

export default proxy(req => {
	const { nextUrl, auth } = req
	const path = nextUrl.pathname
	const isAuth = !!auth?.user
	const role = auth?.user?.role ?? null
	const userId = auth?.user?.id

	try {
		// Determine if current route is authorized for user's role
		const hasAccess = isRouteAuthorized(path, role)

		// Log access attempt with actual authorization result
		logAccess(path, role, hasAccess)

		// Check if current path is a public route
		const isPublicRoute = matchesAnyRoute(path, ROUTE_CONFIG.public)

		// --- CALLBACK URL HANDLING ---
		// Handle post-auth redirects for authenticated users only
		// Skip callback handling for public routes (they don't need callbacks)
		// BUT: Don't handle callback URLs on the signature page itself
		const callbackUrl = nextUrl.searchParams.get("callbackUrl")
		if (isAuth && role && callbackUrl && !isPublicRoute && path !== "/auth/signature") {
			const kycStatus = auth?.user?.kycStatus
			// ts-expect-error augmented user field
			const userStatus = auth?.user?.status

			// STRICT KYC: If not verified, always redirect to KYC first, regardless of callback
			if (kycStatus === "NOT_STARTED" || kycStatus === "PENDING") {
				const kycUrl = new URL("/auth/kyc", nextUrl)
				logRedirect(path, kycUrl.pathname, "kyc required before callback")
				return NextResponse.redirect(kycUrl)
			}

			// USER STATUS: If user has not active status, redirect to status page
			if (userStatus !== "ACTIVE") {
				const statusUrl = new URL("/auth/status", nextUrl)
				logRedirect(path, statusUrl.pathname, "user status required before callback")
				return NextResponse.redirect(statusUrl)
			}

			try {
				const callbackObj = new URL(callbackUrl, nextUrl.origin)
				const callbackPath = callbackObj.pathname

				const callbackAuth = isRouteAuthorized(callbackPath, role)
				if (callbackAuth) {
					// CALLBACK ALLOWED: User can access the callback URL
					logRedirect(path, callbackUrl, "callback redirect")
					return NextResponse.redirect(callbackObj)
				} else {
					// CALLBACK DENIED: User lacks permission for callback URL
					const redirectUrl = getDefaultRoute(role)
					logRedirect(path, redirectUrl, "callback not authorized")
					return NextResponse.redirect(new URL(redirectUrl, nextUrl))
				}
			} catch {
				// If callback URL is invalid, redirect to default route
				const redirectUrl = getDefaultRoute(role)
				logRedirect(path, redirectUrl, "invalid callback URL")
				return NextResponse.redirect(new URL(redirectUrl, nextUrl))
			}
		}

		// --- ACCESS GRANTED ---
		// User has permission: public routes, shared protected, or role-specific routes
		if (hasAccess) {
			// STRICT KYC GATE: All authenticated users must complete KYC before accessing any protected routes
			const onAuthPage = matchesAnyRoute(path, ROUTE_CONFIG.publicOnly) || path.startsWith("/auth/")
			// ts-expect-error augmented user field
			const kycStatus = auth?.user?.kycStatus

			// KYC Gate: Redirect to KYC page if:
			// - User is authenticated AND
			// - Not already on KYC page AND
			// - Not on other auth pages (login, register, etc.) AND
			// - KYC status is NOT_STARTED or PENDING (not yet VERIFIED)
			if (
				isAuth &&
				path !== "/auth/kyc" &&
				!onAuthPage &&
				(kycStatus === "NOT_STARTED" || kycStatus === "PENDING")
			) {
				const kycUrl = new URL("/auth/kyc", nextUrl)
				logRedirect(path, kycUrl.pathname, "strict kyc gate - verification required")
				return NextResponse.redirect(kycUrl)
			}

			const userStatus = auth?.user?.status
			if (
				isAuth &&
				path !== "/auth/status" &&
				!onAuthPage &&
				path !== "/auth/kyc" &&
				userStatus !== "ACTIVE"
			) {
				const statusUrl = new URL("/auth/status", nextUrl)
				logRedirect(path, statusUrl.pathname, "user status gate - account not active")
				return NextResponse.redirect(statusUrl)
			}

			const response = NextResponse.next()
			return addCustomHeaders(response, userId, path)
		}

		// --- ACCESS DENIED (AUTHENTICATED) ---
		// User is logged in but lacks permission for this route
		// Only treat as authenticated if they have a valid role
		if (isAuth && role) {
			const isPublicOnly = matchesAnyRoute(path, ROUTE_CONFIG.publicOnly)
			const kycStatus = auth?.user?.kycStatus
			const userStatus = auth?.user?.status

			// Determine redirect route based on KYC and user status
			const getRedirectRoute = () => {
				// KYC takes priority
				if (kycStatus === "NOT_STARTED" || kycStatus === "PENDING") {
					return "/auth/kyc"
				}
				if (userStatus !== "ACTIVE") {
					return "/auth/status"
				}
				// Default route
				return getDefaultRoute(role)
			}

			if (isPublicOnly) {
				// AUTH ROUTES: Logged-in users cannot access auth pages
				const defaultRoute = getRedirectRoute()
				logRedirect(path, defaultRoute, "authenticated user accessing public-only route")
				return NextResponse.redirect(new URL(defaultRoute, nextUrl))
			}

			// INSUFFICIENT PERMISSIONS: User role cannot access this protected route
			const defaultRoute = getRedirectRoute()
			logRedirect(path, defaultRoute, "unauthorized access")
			return NextResponse.redirect(new URL(defaultRoute, nextUrl))
		}

		// --- ACCESS DENIED (UNAUTHENTICATED) ---
		// User must log in to access protected routes
		// This includes users with no role (incomplete authentication)
		const loginUrl = new URL("/auth/login", nextUrl)
		// Only set callbackUrl if the current path is a protected route (not public)
		// This prevents callbackUrl pollution when navigating to public routes
		if (!matchesAnyRoute(path, ROUTE_CONFIG.public)) {
			const fullUrl = `${path}${nextUrl.search}`
			loginUrl.searchParams.set("callbackUrl", fullUrl)
		}
		logRedirect(path, loginUrl.pathname, "authentication required")

		return NextResponse.redirect(loginUrl)
	} catch (error) {
		logError(error, "middleware execution")

		// Fail safely - redirect to error page in production
		if (env.NODE_ENV === "production") {
			return NextResponse.redirect(new URL("/error", nextUrl))
		}

		// Re-throw in development for debugging
		throw error
	}
})

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

export const config = {
	matcher: [
		/*
		 * Match all request paths except for:
		 * - API routes starting with /api
		 * - Next.js static files (_next/static)
		 * - Next.js image optimization files (_next/image)
		 * - Assets directory (assets)
		 * - Static files (favicon, images, etc.)
		 */
		"/((?!api|_next/static|_next/image|assets|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|js|css|woff|woff2|ttf|eot)).*)",
	],
}
