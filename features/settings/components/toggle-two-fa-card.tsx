"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

import { ToggleTwoFAForm } from "@/features/settings/components/forms/form.toggle-two-fa"
import { ToggleTwoFACardSkeleton } from "@/features/settings/components/toggle-two-fa-card-skeleton"

export function ToggleTwoFACard() {
	const { data: twoFAStatus, isLoading } = trpc.settings.checkTwoFAStatus.useQuery()

	if (isLoading) {
		return <ToggleTwoFACardSkeleton />
	}

	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					Enable Two-Factor Authentication
				</CardTitle>
				<CardDescription>Enable two-factor authentication for additional security.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<ToggleTwoFAForm twoFAStatus={twoFAStatus} />
			</CardContent>
		</Card>
	)
}
