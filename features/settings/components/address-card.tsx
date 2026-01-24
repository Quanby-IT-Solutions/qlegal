"use client"

import { MapPin } from "lucide-react"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { AddressForm } from "@/features/settings/components/forms/form.address"

export function AddressCard() {
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					<MapPin className="size-5" />
					Address
				</CardTitle>
				<CardDescription>
					Manage your address information. This will be used for document signing records.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<AddressForm />
			</CardContent>
		</Card>
	)
}
