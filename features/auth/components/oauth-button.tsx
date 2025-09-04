"use client"

import { useState } from "react"
import { LoaderIcon } from "lucide-react"
import { signIn } from "next-auth/react"

import GoogleIcon from "@/core/components/branding/google-icon"
import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

type Provider = "google"

type OAuthButtonProps = React.ComponentProps<typeof Button> & {
	callbackUrl?: string
	label: string
	provider: Provider
}

const providerIcons: Record<Provider, React.ReactNode> = {
	google: <GoogleIcon />,
}

export const OAuthButton = ({
	callbackUrl,
	label,
	provider,
	className,
	...props
}: OAuthButtonProps) => {
	const [isLoading, setIsLoading] = useState(false)

	const handleClick = async () => {
		setIsLoading(true)
		await signIn(provider, {
			callbackUrl: callbackUrl ?? "/",
			prompt: "select_account",
		})
	}

	return (
		<Button
			className={cn("w-full items-center", className)}
			variant="outline"
			onClick={handleClick}
			disabled={isLoading}
			{...props}
		>
			{isLoading ? <LoaderIcon className="size-4 animate-spin" /> : providerIcons[provider]}
			{label}
		</Button>
	)
}
