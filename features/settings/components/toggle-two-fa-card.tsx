"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { ToggleTwoFAForm } from "@/features/settings/components/forms/form.toggle-two-fa"

export function ToggleTwoFACard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					Enable Two-Factor Authentication
				</CardTitle>
				<CardDescription>Enable two-factor authentication for additional security.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<ToggleTwoFAForm />
			</CardContent>
		</Card>
	)
}
