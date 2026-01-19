import { redirect } from "next/navigation"

import { QuanbyLogo } from "@/core/components/quanby-logo"

import { auth } from "@/services/next-auth"

import { checkUserLivenessStatus } from "@/features/liveness-validation/api/liveness.actions"
import { LivenessValidationCard } from "@/features/liveness-validation/components/liveness-validation-card"

export default async function LivenessValidationPage({
	searchParams,
}: {
	searchParams: Promise<{ redirect?: string; meetingId?: string }>
}) {
	const session = await auth()
	const params = await searchParams

	// Require authentication
	if (!session?.user?.id) {
		redirect("/auth/login")
	}

	// Check if user is already verified for this specific meeting
	const livenessStatus = await checkUserLivenessStatus(params.meetingId)
	if (livenessStatus.success && livenessStatus.data?.isVerified && params.redirect) {
		// Already verified for this meeting, redirect to the intended destination
		redirect(params.redirect)
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-10">
			<div className="w-full max-w-2xl space-y-6">
				{/* Logo */}
				<div className="flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>

				{/* Main Card */}
				<LivenessValidationCard redirectUrl={params.redirect} meetingId={params.meetingId} />

				{/* Footer Info */}
				<div className="space-y-2 text-center">
					{params.meetingId && (
						<p className="text-primary mb-3 text-sm font-medium">
							This verification is required to join the meeting
						</p>
					)}
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
