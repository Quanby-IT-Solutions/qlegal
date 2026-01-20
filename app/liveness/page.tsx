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
		<div className="from-background via-muted/20 to-background relative flex min-h-screen items-center justify-center bg-gradient-to-br px-4 py-10">
			<div className="w-full max-w-2xl space-y-6">
				{/* Logo */}
				<div className="flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>

				{/* Main Card */}
				<LivenessValidationCard 
					redirectUrl={params.redirect} 
					meetingId={params.meetingId}
					canGoBack={!!params.redirect}
				/>

				{/* Footer Info */}
				<div className="space-y-3 text-center">
					{params.meetingId && (
						<div className="bg-primary/10 border-primary/20 inline-flex items-center gap-2 rounded-full border px-4 py-2">
							<div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
							<p className="text-primary text-sm font-medium">
								Required to join meeting
							</p>
						</div>
					)}
					<p className="text-muted-foreground text-sm">
						Secured by HyperVerge AI • Images not stored
					</p>
				</div>
			</div>
		</div>
	)
}
