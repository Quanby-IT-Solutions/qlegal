"use client"

import { useSession } from "next-auth/react"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

import { EnpProfileForm } from "@/features/profile/components/forms/form.enp-profile"

export function EnpProfileCard() {
	const { data: session } = useSession()
	const { isLoading } = trpc.profile.getEnpProfile.useQuery()

	if (session?.user?.role !== "ENP") {
		return null
	}

	if (isLoading) {
		return (
			<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardHeader className="px-8 pt-4">
					<CardTitle className="text-lg font-medium">ENP Profile</CardTitle>
					<CardDescription>Loading profile information...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
                Electronic Notary Public Information
				</CardTitle>
				<CardDescription>Update your Electronic Notary Public credentials and information here.</CardDescription>
			</CardHeader>
			<CardContent className="px-8">
				<EnpProfileForm />
			</CardContent>
		</Card>
	)
}
