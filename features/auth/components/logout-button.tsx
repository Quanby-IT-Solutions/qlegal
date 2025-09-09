"use client"

import { signOut } from "next-auth/react"

import { Button } from "@/core/components/ui/button"

export function LogoutButton() {
	return (
		<Button variant="link" onClick={() => signOut({ callbackUrl: "/login" })}>
			Logout
		</Button>
	)
}
