import { type Metadata } from "next"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

export const metadata: Metadata = {
	title: "Reset Your Password | Secure Account Recovery",
	description:
		"Create a new, secure password for your account. Follow our guided process to reset your password and regain access to your account safely.",
}

export default function Page({ searchParams: { token } }: { searchParams: { token: string } }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Reset your password: {token}</CardTitle>
				<CardDescription>Enter a new password for your account.</CardDescription>
			</CardHeader>
			<CardContent>{/* <ResetPasswordForm token={token} /> */}</CardContent>
		</Card>
	)
}
