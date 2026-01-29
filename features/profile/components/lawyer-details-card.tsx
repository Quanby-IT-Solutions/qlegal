"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { LawyerDetailsForm } from "@/features/profile/components/forms/form.lawyer-details"

export function LawyerDetailsCard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
				Lawyer details
				</CardTitle>
				<CardDescription>Update your lawyer details here.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<LawyerDetailsForm />
			</CardContent>
		</Card>
	)
}
