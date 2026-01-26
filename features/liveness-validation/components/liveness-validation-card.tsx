"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import {
	ArrowLeft,
	Camera,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Smartphone,
	XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import {
	getLivenessMode,
	startHostedLivenessWorkflow,
} from "@/features/liveness-validation/api/liveness.actions"
import { SelfieCapture } from "@/features/liveness-validation/components/selfie-capture"

interface LivenessDecisionResult {
	isLive: boolean
	actionPassed: boolean
	isApproved: boolean
	message: string
	qualityIssues: string[]
	liveFaceValue: "yes" | "no" | "unknown"
	summaryAction: "pass" | "fail" | "unknown"
}

interface ValidationResult {
	transactionId: string
	status: string
	decision: LivenessDecisionResult
	timestamp: Date
}

export function LivenessValidationCard({
	redirectUrl,
	meetingId,
	canGoBack = false,
}: {
	redirectUrl?: string
	meetingId?: string
	canGoBack?: boolean
}) {
	const router = useRouter()
	const [isDirectModeEnabled, setIsDirectModeEnabled] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [showCapture, setShowCapture] = useState(false)
	const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
	const [isPending, startTransition] = useTransition()

	// Check liveness mode on mount
	useEffect(() => {
		let isMounted = true

		void getLivenessMode()
			.then(result => {
				if (!isMounted) return
				if (result.success && result.data) {
					setIsDirectModeEnabled(result.data.isDirectMode)
				}
			})
			.catch(error => {
				console.error("Failed to get liveness mode:", error)
			})
			.finally(() => {
				if (!isMounted) return
				setIsLoading(false)
			})

		return () => {
			isMounted = false
		}
	}, [])

	const handleSuccess = (result: {
		transactionId: string
		status: string
		decision: LivenessDecisionResult
	}) => {
		setShowCapture(false)

		if (redirectUrl && result.decision.isApproved) {
			// Seamless redirect: toast only, no result screen
			toast.success("Verification complete!")
			window.location.href = redirectUrl
			return
		}

		if (!result.decision.isApproved) {
			toast.error("Verification failed")
		}
		setValidationResult({ ...result, timestamp: new Date() })
	}

	const handleError = (error: string) => {
		console.error("Liveness validation error:", error)
	}

	const handleStartNew = () => {
		setValidationResult(null)
		setShowCapture(false)
	}

	const handleHostedWorkflow = () => {
		startTransition(async () => {
			try {
				console.log("🔵 Starting hosted liveness workflow...")
				console.log("   - Meeting ID:", meetingId ?? "N/A")
				const result = await startHostedLivenessWorkflow(redirectUrl, meetingId)

				if (!result.success) {
					throw new Error(result.error ?? "Failed to start hosted workflow")
				}

				if (!result.data?.redirectUrl) {
					throw new Error("No redirect URL returned")
				}

				console.log("✅ Redirecting to HyperVerge hosted page:", result.data.redirectUrl)
				toast.success("Redirecting to verification page...")

				// Redirect to HyperVerge hosted page
				window.location.href = result.data.redirectUrl
			} catch (error) {
				console.error("Failed to start hosted workflow:", error)
				toast.error(error instanceof Error ? error.message : "Failed to start verification")
			}
		})
	}

	if (isLoading) {
		return (
			<Card className="w-full shadow-xl">
				<CardContent className="flex items-center justify-center py-12">
					<Loader2 className="text-primary size-8 animate-spin" />
				</CardContent>
			</Card>
		)
	}

	if (!isDirectModeEnabled) {
		return (
			<Card className="w-full shadow-xl">
				<CardHeader>
					<CardTitle>Liveness Verification Unavailable</CardTitle>
					<CardDescription>Direct liveness mode is currently disabled.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
						<p className="text-sm text-amber-900 dark:text-amber-100">
							Contact your administrator to enable this feature.
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full shadow-xl">
			<CardHeader className="space-y-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex size-12 items-center justify-center rounded-xl">
							<Camera className="text-primary size-6" />
						</div>
						<div>
							<CardTitle className="text-2xl">Face Verification</CardTitle>
							<CardDescription className="mt-1">Verify your identity to continue</CardDescription>
						</div>
					</div>
					{canGoBack && !showCapture && !validationResult && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/meetings")}
							className="text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Show capture interface */}
				{showCapture && !validationResult && (
					<SelfieCapture
						onSuccess={handleSuccess}
						onError={handleError}
						onCancel={() => setShowCapture(false)}
						meetingId={meetingId}
					/>
				)}

				{/* Show start button */}
				{!showCapture && !validationResult && (
					<div className="space-y-4">
						{/* Direct In-App Capture (if enabled) */}
						{isDirectModeEnabled && (
							<div className="group hover:border-primary/50 cursor-pointer rounded-xl border-2 border-transparent bg-linear-to-br from-blue-50 to-indigo-50 p-6 transition-all dark:from-blue-950/20 dark:to-indigo-950/20">
								<div className="mb-4 flex items-start gap-4">
									<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
										<Camera className="text-primary size-5" />
									</div>
									<div className="flex-1">
										<h3 className="mb-1 font-semibold">Quick Capture</h3>
										<p className="text-muted-foreground text-sm">
											Use your device camera • Instant results
										</p>
									</div>
								</div>
								<Button onClick={() => setShowCapture(true)} className="w-full shadow-lg" size="lg">
									<Camera className="mr-2 h-5 w-5" />
									Start Verification
								</Button>
							</div>
						)}

						{/* Hosted Workflow (Always Available) */}
						<div className="group hover:border-primary/50 cursor-pointer rounded-xl border-2 border-transparent bg-linear-to-br from-purple-50 to-pink-50 p-6 transition-all dark:from-purple-950/20 dark:to-pink-950/20">
							<div className="mb-4 flex items-start gap-4">
								<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
									<Smartphone className="text-primary size-5" />
								</div>
								<div className="flex-1">
									<h3 className="mb-1 font-semibold">Hosted Verification</h3>
									<p className="text-muted-foreground text-sm">
										Secure external page • QR code support
									</p>
								</div>
							</div>
							<Button
								onClick={handleHostedWorkflow}
								variant="outline"
								className="w-full"
								size="lg"
								disabled={isPending}
							>
								{isPending ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Launching...
									</>
								) : (
									<>
										<ExternalLink className="mr-2 h-5 w-5" />
										Open Verification Page
									</>
								)}
							</Button>
						</div>
					</div>
				)}

				{/* Show validation result */}
				{validationResult && (
					<div className="space-y-6">
						{/* Result Card */}
						<div
							className={`rounded-2xl border-2 p-8 text-center ${
								validationResult.decision.isApproved
									? "border-green-500 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
									: "border-red-500 bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20"
							}`}
						>
							<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/80 shadow-lg dark:bg-black/20">
								{validationResult.decision.isApproved ? (
									<CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="size-8 text-red-600 dark:text-red-400" />
								)}
							</div>
							<h3
								className={`mb-2 text-2xl font-bold ${
									validationResult.decision.isApproved
										? "text-green-900 dark:text-green-100"
										: "text-red-900 dark:text-red-100"
								}`}
							>
								{validationResult.decision.isApproved
									? "Verification Complete!"
									: "Verification Failed"}
							</h3>
							<p
								className={`text-sm ${
									validationResult.decision.isApproved
										? "text-green-700 dark:text-green-300"
										: "text-red-700 dark:text-red-300"
								}`}
							>
								{validationResult.decision.message}
							</p>

							{validationResult.decision.qualityIssues.length > 0 && (
								<div className="mt-4 rounded-lg bg-white/50 p-4 dark:bg-black/20">
									<p className="mb-2 text-xs font-medium text-red-800 dark:text-red-300">
										Issues Detected:
									</p>
									<ul className="space-y-1 text-xs text-red-600 dark:text-red-400">
										{validationResult.decision.qualityIssues.map((issue, idx) => (
											<li key={idx}>• {issue}</li>
										))}
									</ul>
								</div>
							)}
						</div>

						{/* Action Button */}
						{!validationResult.decision.isApproved && (
							<Button onClick={handleStartNew} className="w-full shadow-lg" size="lg">
								<Camera className="mr-2 h-5 w-5" />
								Try Again
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
