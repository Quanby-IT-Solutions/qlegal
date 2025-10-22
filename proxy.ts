import { NextResponse } from "next/server"
import NextAuth from "next-auth"

import { getDefaultRoute, isRouteAuthorized } from "@/core/middleware/authorization"
import { ROUTE_CONFIG } from "@/core/middleware/config"
import { logAccess, logError, logRedirect } from "@/core/middleware/logger"
import { matchesAnyRoute } from "@/core/middleware/route-matcher"
import { addCustomHeaders } from "@/core/middleware/security"

import { authConfig } from "@/services/next-auth/config"

const { auth: middleware } = NextAuth(authConfig)

// ============================================================================
// MIDDLEWARE FUNCTION
// ============================================================================

export default middleware(req => {
	const { nextUrl, auth } = req
	const path = nextUrl.pathname
	const isAuth = !!auth?.user
	const role = auth?.user?.role ?? null
	const userId = auth?.user?.id

	// Log access attempt
	logAccess(path, role, true)

	try {
		// Determine if current route is authorized for user's role
		const hasAccess = isRouteAuthorized(path, role)

		// --- CALLBACK URL HANDLING ---
		// Handle post-auth redirects for authenticated users
		// BUT: Don't handle callback URLs on the signature page itself
		const callbackUrl = nextUrl.searchParams.get("callbackUrl")
		if (isAuth && callbackUrl && path !== "/auth/signature") {
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
					const defaultRoute = getDefaultRoute(role!)
					logRedirect(path, defaultRoute, "callback not authorized")
					return NextResponse.redirect(new URL(defaultRoute, nextUrl))
				}
			} catch {
				// If callback URL is invalid, redirect to default route
				const defaultRoute = getDefaultRoute(role!)
				logRedirect(path, defaultRoute, "invalid callback URL")
				return NextResponse.redirect(new URL(defaultRoute, nextUrl))
			}
		}

		// --- ACCESS GRANTED ---
		// User has permission: public routes, shared protected, or role-specific routes
		if (hasAccess) {
			const response = NextResponse.next()
			return addCustomHeaders(response, userId, path)
		}

		// --- ACCESS DENIED (AUTHENTICATED) ---
		// User is logged in but lacks permission for this route
		if (isAuth) {
			const isPublicOnly = matchesAnyRoute(path, ROUTE_CONFIG.publicOnly)

			if (isPublicOnly) {
				// AUTH ROUTES: Logged-in users cannot access auth pages
				const defaultRoute = getDefaultRoute(role!)
				logRedirect(path, defaultRoute, "authenticated user accessing public-only route")
				return NextResponse.redirect(new URL(defaultRoute, nextUrl))
			}

			// INSUFFICIENT PERMISSIONS: User role cannot access this protected route
			const defaultRoute = getDefaultRoute(role!)
			logRedirect(path, defaultRoute, "unauthorized access")
			return NextResponse.redirect(new URL(defaultRoute, nextUrl))
		}

		// --- ACCESS DENIED (UNAUTHENTICATED) ---
		// User must log in to access protected routes
		const loginUrl = new URL("/auth/login", nextUrl)
		const fullUrl = `${path}${nextUrl.search}`
		loginUrl.searchParams.set("callbackUrl", fullUrl)
		logRedirect(path, loginUrl.pathname, "authentication required")

		return NextResponse.redirect(loginUrl)
	} catch (error) {
		logError(error, "middleware execution")

		// Fail safely - redirect to error page in production
		// eslint-disable-next-line no-restricted-properties
		if (process.env.NODE_ENV === "production") {
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
