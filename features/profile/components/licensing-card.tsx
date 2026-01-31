"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { LicensingForm } from "@/features/profile/components/forms/form.licensing"

export function LicensingCard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">Licensing</CardTitle>
				<CardDescription>Update your licensing information here.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<LicensingForm />
			</CardContent>
		</Card>
	)
}
