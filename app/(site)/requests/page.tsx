"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

export default function RequestsPage() {
	const { data: session } = useSession()
	const router = useRouter()
	const isENP = session?.user?.role === "ENP"

	// Redirect to appropriate sub-page based on role
	useEffect(() => {
		if (session?.user) {
			if (isENP) {
				router.replace("/requests/incoming" as Route)
			} else {
				router.replace("/requests/my-requests" as Route)
			}
		}
	}, [session, isENP, router])

	// Show loading state while redirecting
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<p className="text-muted-foreground">Redirecting...</p>
			</div>
		</div>
	)
}
