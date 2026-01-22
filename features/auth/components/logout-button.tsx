"use client"

import { signOut } from "next-auth/react"
import type { ReactNode } from "react"

import { Button } from "@/core/components/ui/button"
import type { ButtonProps } from "@/core/components/ui/button"

interface LogoutButtonProps extends Omit<ButtonProps, "onClick"> {
	callbackUrl?: string
	children?: ReactNode
}

export function LogoutButton({
	callbackUrl = "/login",
	children = "Logout",
	...buttonProps
}: LogoutButtonProps) {
	return (
		<Button
			{...buttonProps}
			onClick={() => {
				// Clear KYC skip session cookie before logout
				document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
				signOut({ callbackUrl })
			}}
		>
			{children}
		</Button>
	)
}
