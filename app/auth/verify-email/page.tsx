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
				<LoginForm callbackUrl={token} />
			</CardContent>
		</Card>
	)
}
