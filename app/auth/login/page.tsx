import { type Route } from "next"
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

import { LoginForm } from "@/features/auth/components/forms/form.login"

import { env } from "@/env"

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: Route }>
}) {
	const { callbackUrl } = await searchParams
	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Welcome Back</CardTitle>
				<CardDescription>Sign in to your Quanby Sign account</CardDescription>
			</CardHeader>
			<CardContent>
				<LoginForm callbackUrl={callbackUrl} />
			</CardContent>
			<CardFooter className="text-muted-foreground justify-center text-sm">
				Don&apos;t have an account?{""}
				<Link
					href={
						callbackUrl
							? (`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route)
							: "/auth/register"
					}
					className={cn(
						buttonVariants({ variant: "link" }),
						"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
					)}
				>
					Sign up
				</Link>
			</CardFooter>
		</Card>
	)
}
