"use client"

import { useSession } from "next-auth/react"

import { Card, CardContent } from "@/core/components/ui/card"

import { AvatarForm } from "@/features/profile/components/avatar-form"

export function AvatarCard() {
	const { data: session } = useSession()

	return (
		<Card className="border-border/60 bg-background/80 dark:bg-background/40 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardContent className="py-4">
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<AvatarForm />
					<div>
						<h3 className="text-foreground text-xl font-medium">{session?.user?.name ?? "User"}</h3>
						<p className="text-muted-foreground mt-1 text-sm">Upload your avatar</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
