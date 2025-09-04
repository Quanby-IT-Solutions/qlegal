import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { LoginForm } from "@/features/auth/components/forms/form.login"

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>
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

				<div className="mt-6 text-center">
					<p className="text-muted-foreground text-sm">
						Don&apos;t have an account?{" "}
						{callbackUrl ? (
							<Link
								href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
								className="text-primary hover:text-primary/80 hover:underline"
							>
								Sign up
							</Link>
						) : (
							<Link
								href="/auth/register"
								className="text-primary hover:text-primary/80 hover:underline"
							>
								Sign up
							</Link>
						)}
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
