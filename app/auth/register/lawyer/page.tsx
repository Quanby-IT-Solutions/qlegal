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

import { LawyerRegisterForm } from "@/features/auth/components/forms/form.register-lawyer"

export default async function LawyerRegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: Route }>
}) {
	const { callbackUrl } = await searchParams

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="size-16" />
				</div>
				<CardTitle className="text-2xl">Lawyer Registration</CardTitle>
				<CardDescription>
					Register as an Electronic Notary Public (ENP) to notarize documents on Quanby Sign
				</CardDescription>
			</CardHeader>
			<CardContent>
				<LawyerRegisterForm callbackUrl={callbackUrl} />
			</CardContent>
			<CardFooter className="flex-col gap-2">
				<div className="text-muted-foreground text-center text-sm">
					Already have an account?{" "}
					<Link
						href={
							callbackUrl
								? (`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route)
								: "/auth/login"
						}
						className={cn(
							buttonVariants({ variant: "link" }),
							"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
						)}
					>
						Sign in
					</Link>
				</div>
				<div className="text-muted-foreground text-center text-sm">
					Not a lawyer?{" "}
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
						Register as Principal
					</Link>
				</div>
			</CardFooter>
		</Card>
	)
}
