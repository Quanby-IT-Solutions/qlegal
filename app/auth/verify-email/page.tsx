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

import { VerifyEmailForm } from "@/features/auth/components/forms/form.verify-email"

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const { token } = await searchParams

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Confirming your verification</CardTitle>
				<CardDescription>We just want to make sure it&apos;s really you.</CardDescription>
			</CardHeader>
			<CardContent>
				<VerifyEmailForm token={token} />
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
