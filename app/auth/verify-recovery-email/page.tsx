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

import { VerifyRecoveryEmailForm } from "@/features/onboarding/components/form.verify-recovery-email"

export default async function VerifyRecoveryEmailPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const params = await searchParams
	const token = params.token ? decodeURIComponent(params.token) : undefined

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Recovery Email Verification</CardTitle>
				<CardDescription>Confirming your recovery email address.</CardDescription>
			</CardHeader>
			<CardContent>
				<VerifyRecoveryEmailForm token={token} />
			</CardContent>
			<CardFooter className="text-muted-foreground justify-center text-sm">
				<Link
					href="/settings"
					className={cn(
						buttonVariants({ variant: "link" }),
						"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
					)}
				>
					Back to Settings
				</Link>
			</CardFooter>
		</Card>
	)
}
