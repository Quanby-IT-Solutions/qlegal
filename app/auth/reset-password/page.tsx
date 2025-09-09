import { type Metadata } from "next"
import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

import { ResetPasswordForm } from "@/features/auth/components/forms/form.reset-password"

export const metadata: Metadata = {
	title: "Reset Your Password | Secure Account Recovery",
	description:
		"Create a new, secure password for your account. Follow our guided process to reset your password and regain access to your account safely.",
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{
		token: string
	}>
}) {
	const { token } = await searchParams

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Reset your password </CardTitle>
				<CardDescription>Enter a new password for your account.</CardDescription>
			</CardHeader>
			<CardContent>
				<ResetPasswordForm token={token} />
			</CardContent>
			<CardFooter className="text-muted-foreground justify-center text-sm">
				<Link
					href="/auth/login"
					className={cn(
						buttonVariants({ variant: "link" }),
						"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
					)}
				>
					Back to Login
				</Link>
			</CardFooter>
		</Card>
	)
}
