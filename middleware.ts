import { NextResponse } from "next/server"
import NextAuth from "next-auth"

import { authConfig } from "./services/next-auth/config"

const { auth: middleware } = NextAuth(authConfig)

export default middleware(async req => {
	const { nextUrl } = req

	if (nextUrl.pathname === "/") {
		return NextResponse.redirect(new URL("/auth/login", nextUrl.origin))
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
