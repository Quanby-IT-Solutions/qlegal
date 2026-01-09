import { redirect } from "next/navigation"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { LivenessValidationCard } from "@/features/liveness-validation/components/liveness-validation-card"
import { auth } from "@/services/next-auth"

export default async function LivenessValidationPage() {
	const session = await auth()
	
	// Require authentication
	if (!session?.user?.id) {
		redirect("/auth/login")
	}

	return (
		<div className="container flex items-center justify-center min-h-screen py-10">
			<div className="w-full max-w-2xl space-y-6">
				{/* Logo */}
				<div className="flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>

				{/* Main Card */}
				<LivenessValidationCard />

				{/* Footer Info */}
				<div className="text-center space-y-2">
					<p className="text-sm text-muted-foreground">
						Your verification is processed securely using HyperVerge AI technology
					</p>
					<p className="text-xs text-muted-foreground">
						Images are used only for verification and are not stored
					</p>
				</div>
			</div>
		</div>
	)
}
