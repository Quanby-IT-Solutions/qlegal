import { type Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	// CardFooter,
	CardHeader,
	// CardLink,
	// CardLogoutButton,
	CardTitle,
} from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

import { LogoutButton } from "@/features/auth/components/logout-button"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export const metadata: Metadata = {
	title: "Authentication Error",
	description:
		"An error occurred during the authentication process. Please review the details and try again.",
}

type ErrorPageParam = "Configuration" | "AccessDenied" | "Verification"

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ error: ErrorPageParam }>
}) {
	const { error } = await searchParams

	const errorMessages: Record<ErrorPageParam, { title: string; description: string }> = {
		AccessDenied: {
			title: "Access Denied!",
			description: "You do not have permission to access this resource.",
		},
		Configuration: {
			title: "Configuration Error",
			description: "There was an issue with the system configuration. Please contact support.",
		},
		Verification: {
			title: "Verification Required",
			description: "Please verify your account to proceed.",
		},
	}

	const { title, description } = errorMessages[error] || {
		title: "Something went wrong!",
		description: "Please contact your system administrators for assistance.",
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="items-center justify-center">
				{!error && <FormResponse type="error" message="Invalid or missing token." />}
				<FormResponse type="error" message={error} />
			</CardContent>
			<CardFooter className="justify-center">
				{error === "AccessDenied" || error === "Configuration" ? (
					<LogoutButton />
				) : (
					<Link
						href="/auth/login"
						className={cn(
							buttonVariants({ variant: "link" }),
							"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
						)}
					>
						Back to Login
					</Link>
				)}
			</CardFooter>
		</Card>
	)
}
