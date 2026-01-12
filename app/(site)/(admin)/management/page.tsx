"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ManagementPage() {
	const router = useRouter()

	// Redirect to user management as default
	useEffect(() => {
		router.replace("/management/users" as Route)
	}, [router])

	// Show loading state while redirecting
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<p className="text-muted-foreground">Redirecting...</p>
			</div>
		</div>
	)
}
