"use client"

import { signOut } from "next-auth/react"

import { Button } from "@/core/components/ui/button"

export function LogoutButton() {
	return (
		<Button
			variant="link"
			onClick={() => {
				// Clear KYC skip session cookie before logout
				document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
				signOut({ callbackUrl: "/login" })
			}}
		>
			Logout
		</Button>
	)
}
