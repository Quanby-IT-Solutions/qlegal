"use client"

import type { ReactNode } from "react"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"

/**
 * Client-only session wrapper for the root layout.
 * Keeps `SessionProvider` in a dedicated module so Turbopack/Next resolve a single
 * `next-auth/react` instance (avoids `useSession` seeing a different context than the provider).
 */
export function AuthSessionProvider({
	children,
	session,
}: {
	children: ReactNode
	session: Session | null
}) {
	return <SessionProvider session={session}>{children}</SessionProvider>
}
