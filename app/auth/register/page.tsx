import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { RegisterForm } from "@/features/auth/components/forms/form.register"

export default async function RegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>
}) {
	const params = await searchParams
	let callbackUrl = params.callbackUrl

	if (callbackUrl && !callbackUrl.startsWith("/")) {
		callbackUrl = undefined
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Create Account</CardTitle>
				<CardDescription>Join Quanby Sign and start signing documents securely</CardDescription>
			</CardHeader>
			<CardContent>
				<RegisterForm callbackUrl={callbackUrl} />
				<div className="mt-6 text-center">
					<p className="text-muted-foreground text-sm">
						Already have an account?{" "}
						{callbackUrl ? (
							<Link
								href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
								className="text-primary hover:text-primary/80 hover:underline"
							>
								Sign in
							</Link>
						) : (
							<Link
								href="/auth/login"
								className="text-primary hover:text-primary/80 hover:underline"
							>
								Sign in
							</Link>
						)}
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
