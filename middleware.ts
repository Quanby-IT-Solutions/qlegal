import { NextResponse } from "next/server"

import { getDefaultRoute, isRouteAuthorized } from "./core/middleware/authorization"
import { type UserRole } from "./services/drizzle/schema/auth"
import { auth } from "./services/next-auth"

export default auth(async req => {
	const { nextUrl } = req
	const { pathname } = nextUrl

	// Get the session from the auth middleware
	const session = req.auth

	// Extract user role from session
	const userRole = session?.user?.role as UserRole | null

	// Check if the current route is authorized
	if (!isRouteAuthorized(pathname, userRole)) {
		// If not authenticated, redirect to login
		if (!session?.user) {
			return NextResponse.redirect(new URL("/auth/login", nextUrl.origin))
		}

		// If authenticated but not authorized, redirect to default route for their role
		const defaultRoute = getDefaultRoute(userRole!)
		return NextResponse.redirect(new URL(defaultRoute, nextUrl.origin))
	}

	return NextResponse.next()
})

export const config = {
	runtime: "nodejs",
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
