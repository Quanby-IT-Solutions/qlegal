"use client"

import { useSession } from "next-auth/react"

import { Card, CardContent } from "@/core/components/ui/card"

import { AvatarSection } from "./avatar-section"
import { ProfessionalDetails } from "./enp-professional-details"

export function AvatarCard() {
	const { data: session } = useSession()
	const isENP = session?.user?.role === "ENP"

	if (isENP) {
		return (
			<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardContent className="grid grid-cols-1 lg:grid-cols-2">
					{/* Left Section - Avatar Upload */}
					<AvatarSection />

					{/* Right Section - Professional Details */}
					<ProfessionalDetails />
				</CardContent>
			</Card>
		)
	}

	// Default layout for non-ENP users
	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardContent className="py-8">
				<AvatarSection />
			</CardContent>
		</Card>
	)
}
