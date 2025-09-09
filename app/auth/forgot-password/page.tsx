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

import { ForgotPasswordForm } from "@/features/auth/components/forms/form.forgot-password"

export const metadata: Metadata = {
	title: "Forgot Password | Account Recovery",
	description:
		"Securely reset your password. Enter your email address to receive instructions on how to regain access to your account.",
}

export default function Page() {
	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Forgot your password?</CardTitle>
				<CardDescription>Enter your email address to reset your password.</CardDescription>
			</CardHeader>
			<CardContent>
				<ForgotPasswordForm />
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
