import { NextResponse } from "next/server"
import NextAuth from "next-auth"

import { getDefaultRoute, isRouteAuthorized } from "@/core/middleware/authorization"
import { ROUTE_CONFIG } from "@/core/middleware/config"
import { matchesAnyRoute } from "@/core/middleware/route-matcher"

import { authConfig } from "@/services/next-auth/config"

import { env } from "@/env"

const { auth: proxy } = NextAuth(authConfig)

function logAccess(path: string, role: string | null, authorized: boolean): void {
	if (env.NODE_ENV === "development") {
		console.log(`\n[Middleware] ${path} | Role: ${role ?? "anonymous"} | Authorized: ${authorized}`)
	}
}

function logRedirect(from: string, to: string, reason: string): void {
	if (env.NODE_ENV === "development") {
		console.log(`[Middleware] Redirect: ${from} -> ${to} (${reason})`)
	}
}

function logError(error: unknown, context?: string): void {
	const contextInfo = context ? `[${context}] ` : ""
	console.error(`[Middleware] ${contextInfo}Error:`, error)
}

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
			const userStatus = auth?.user?.status

			try {
				const callbackObj = new URL(callbackUrl, nextUrl.origin)
				const callbackPath = callbackObj.pathname

				if (userStatus === "SUSPENDED" && callbackPath !== "/auth/status") {
					const statusUrl = new URL("/auth/status", nextUrl)
					logRedirect(path, statusUrl.pathname, "account suspended for callback route")
					return NextResponse.redirect(statusUrl)
				}

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
			const onAuthPage =
				matchesAnyRoute(path, ROUTE_CONFIG.publicOnly) ||
				(path.startsWith("/auth/") && path !== "/auth/legal-registration")
			// ts-expect-error augmented user field
			const kycStatus = auth?.user?.kycStatus

			const userStatus = auth?.user?.status
			if (isAuth && userStatus === "SUSPENDED" && path !== "/auth/status") {
				const statusUrl = new URL("/auth/status", nextUrl)
				logRedirect(path, statusUrl.pathname, "account suspended")
				return NextResponse.redirect(statusUrl)
			}

			// ONBOARDING REMINDER GATE:
			// After KYC is verified, users are reminded to complete optional profile details.
			// They can snooze reminders for 7 days from onboarding.
			const onboardingSnoozedUntilRaw = auth?.user?.onboardingSnoozedUntil
			const onboardingSnoozedUntil =
				typeof onboardingSnoozedUntilRaw === "string" ? new Date(onboardingSnoozedUntilRaw) : null
			const isOnboardingSnoozed =
				onboardingSnoozedUntil !== null &&
				!Number.isNaN(onboardingSnoozedUntil.getTime()) &&
				onboardingSnoozedUntil.getTime() > Date.now()

			// Allow through if user completed the wizard (onboardingComplete) or all details (onboardingDetailsComplete) or snoozed
			if (
				isAuth &&
				kycStatus === "VERIFIED" &&
				!path.startsWith("/onboarding") &&
				!onAuthPage &&
				path !== "/auth/status" &&
				role !== "ADMIN" &&
				role !== "ENA" &&
				!auth?.user?.onboardingDetailsComplete &&
				!auth?.user?.onboardingComplete &&
				!isOnboardingSnoozed
			) {
				const onboardingUrl = new URL("/onboarding", nextUrl)
				logRedirect(path, onboardingUrl.pathname, "onboarding reminder gate")
				return NextResponse.redirect(onboardingUrl)
			}

			const response = NextResponse.next()

			if (userId) {
				response.headers.set("X-User-ID", userId)
			}
			response.headers.set("x-current-path", path)

			return response
		}

		// --- ACCESS DENIED (AUTHENTICATED) ---
		// User is logged in but lacks permission for this route
		// Only treat as authenticated if they have a valid role
		if (isAuth && role) {
			const isPublicOnly = matchesAnyRoute(path, ROUTE_CONFIG.publicOnly)
			const userStatus = auth?.user?.status

			const getRedirectRoute = () => {
				if (userStatus === "SUSPENDED") {
					return "/auth/status"
				}
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
