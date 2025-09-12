"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { ChangePasswordForm } from "@/features/profile/components/forms/form.change-password"

export function ChangePasswordCard() {
	return (
		<Card className="border-border/60 bg-background/80 dark:bg-background/40 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					Change Password
				</CardTitle>
				<CardDescription>Update your password here.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<ChangePasswordForm />
			</CardContent>
		</Card>
	)
}
