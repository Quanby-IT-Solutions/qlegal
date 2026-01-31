"use client"

import { useSession } from "next-auth/react"

import { AvatarUploadForm } from "./forms/form.avatar-upload"

export function AvatarSection() {
	const { data: session } = useSession()

	return (
		<div className="flex flex-col items-center justify-center space-y-4 text-center">
			<AvatarUploadForm />

			<div>
				<h3 className="text-foreground text-xl font-medium">{session?.user?.name ?? "User"}</h3>
				<p className="text-muted-foreground mt-1 text-sm">Upload your avatar</p>
			</div>
		</div>
	)
}
