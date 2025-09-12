"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { AddPasswordForm } from "@/features/settings/components/forms/form.add-password"

export function AddPasswordCard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">Add Password</CardTitle>
				<CardDescription>
					Add a password to your account for additional security and the ability to sign in with
					email and password.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<AddPasswordForm />
			</CardContent>
		</Card>
	)
}
