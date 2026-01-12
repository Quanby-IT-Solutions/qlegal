import { redirect } from "next/navigation"

import { QuanbyLogo } from "@/core/components/quanby-logo"

import { auth } from "@/services/next-auth"

import { LivenessValidationCard } from "@/features/liveness-validation/components/liveness-validation-card"

export default async function LivenessValidationPage() {
	const session = await auth()

	// Require authentication
	if (!session?.user?.id) {
		redirect("/auth/login")
	}

	return (
		<div className="container flex min-h-screen items-center justify-center py-10">
			<div className="w-full max-w-2xl space-y-6">
				{/* Logo */}
				<div className="flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>

				{/* Main Card */}
				<LivenessValidationCard />

				{/* Footer Info */}
				<div className="space-y-2 text-center">
					<p className="text-muted-foreground text-sm">
						Your verification is processed securely using HyperVerge AI technology
					</p>
					<p className="text-muted-foreground text-xs">
						Images are used only for verification and are not stored
					</p>
				</div>
			</div>
		</div>
	)
}
