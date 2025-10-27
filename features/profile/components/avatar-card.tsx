"use client"

import { useSession } from "next-auth/react"

import { Card, CardContent } from "@/core/components/ui/card"

import { AvatarUploadForm } from "@/features/profile/components/forms/form.avatar-upload"

export function AvatarCard() {
	const { data: session } = useSession()

	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardContent className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
				<AvatarUploadForm />

				<div>
					<h3 className="text-foreground text-xl font-medium">{session?.user?.name ?? "User"}</h3>
					<p className="text-muted-foreground mt-1 text-sm">Upload your avatar</p>
				</div>
			</CardContent>
		</Card>
	)
}
