"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { RollRegistrationForm } from "@/features/profile/components/forms/form.roll-registration"

export function RollRegistrationCard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					Roll Registration
				</CardTitle>
				<CardDescription>Update your roll registration details here.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<RollRegistrationForm />
			</CardContent>
		</Card>
	)
}
