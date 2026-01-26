"use client"

import { useSession } from "next-auth/react"

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

import { CertificationsCard } from "@/features/profile/components/certifications-card"
import { LicensingCard } from "@/features/profile/components/licensing-card"
import { RollRegistrationCard } from "@/features/profile/components/roll-registration-card"

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
		<div className="space-y-6">
			<RollRegistrationCard />
			<LicensingCard />
			<CertificationsCard />
		</div>
	)
}
