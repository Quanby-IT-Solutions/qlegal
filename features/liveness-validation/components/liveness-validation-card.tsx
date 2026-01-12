"use client"

import { useEffect, useState } from "react"
import { Camera, CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { getLivenessMode } from "@/features/liveness-validation/api/liveness.actions"
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

export function LivenessValidationCard() {
	const [isDirectModeEnabled, setIsDirectModeEnabled] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [showCapture, setShowCapture] = useState(false)
	const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

	// Check liveness mode on mount
	useEffect(() => {
		getLivenessMode().then(result => {
			if (result.success && result.data) {
				setIsDirectModeEnabled(result.data.isDirectMode)
			}
			setIsLoading(false)
		})
	}, [])

	const handleSuccess = (result: {
		transactionId: string
		status: string
		decision: LivenessDecisionResult
	}) => {
		setValidationResult({
			...result,
			timestamp: new Date(),
		})
		setShowCapture(false)
	}

	const handleError = (error: string) => {
		console.error("Liveness validation error:", error)
	}

	const handleStartNew = () => {
		setValidationResult(null)
		setShowCapture(true)
	}

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardContent className="flex items-center justify-center pt-6">
					<Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
				</CardContent>
			</Card>
		)
	}

	if (!isDirectModeEnabled) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Liveness Verification Not Available</CardTitle>
					<CardDescription>Direct liveness validation mode is currently disabled.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
						<p className="text-sm text-amber-900 dark:text-amber-100">
							To enable this feature, set{" "}
							<code className="rounded bg-amber-200 px-1.5 py-0.5 dark:bg-amber-900">
								HYPERVERGE_DIRECT_LIVENESS_ENABLED=true
							</code>{" "}
							in your environment configuration.
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Camera className="h-6 w-6" />
					Live Face Verification
				</CardTitle>
				<CardDescription>
					Verify your identity using live selfie capture with liveness detection
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Show capture interface */}
				{showCapture && !validationResult && (
					<SelfieCapture
						onSuccess={handleSuccess}
						onError={handleError}
						onCancel={() => setShowCapture(false)}
					/>
				)}

				{/* Show start button */}
				{!showCapture && !validationResult && (
					<div className="space-y-4">
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
							<p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
								How it works
							</p>
							<ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-300">
								<li>Click "Start Verification" to open your camera</li>
								<li>Position your face in the frame</li>
								<li>Capture a clear selfie</li>
								<li>Our AI will verify you're a real person</li>
							</ul>
						</div>
						<Button onClick={() => setShowCapture(true)} className="w-full" size="lg">
							<Camera className="mr-2 h-5 w-5" />
							Start Verification
						</Button>
					</div>
				)}

				{/* Show validation result */}
				{validationResult && (
					<div className="space-y-4">
						{/* Status Badge */}
						<div className="flex items-center justify-center">
							{validationResult.decision.isApproved ? (
								<Badge className="bg-green-100 px-4 py-2 text-base text-green-800">
									<CheckCircle2 className="mr-2 h-4 w-4" />
									Verified
								</Badge>
							) : (
								<Badge variant="destructive" className="px-4 py-2 text-base">
									<XCircle className="mr-2 h-4 w-4" />
									Rejected
								</Badge>
							)}
						</div>

						{/* Result Details */}
						<div
							className={`rounded-lg border p-4 ${
								validationResult.decision.isApproved
									? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
									: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
							}`}
						>
							<div className="flex items-start gap-3">
								{validationResult.decision.isApproved ? (
									<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
								)}
								<div className="flex-1">
									<p
										className={`mb-1 font-semibold ${
											validationResult.decision.isApproved
												? "text-green-900 dark:text-green-100"
												: "text-red-900 dark:text-red-100"
										}`}
									>
										{validationResult.decision.isApproved
											? "✓ Liveness Verified"
											: "Verification Failed"}
									</p>
									<p
										className={`mb-2 text-sm ${
											validationResult.decision.isApproved
												? "text-green-700 dark:text-green-300"
												: "text-red-700 dark:text-red-300"
										}`}
									>
										{validationResult.decision.message}
									</p>
									{validationResult.decision.qualityIssues.length > 0 && (
										<div className="mt-2">
											<p className="mb-1 text-xs font-medium text-red-800 dark:text-red-300">
												Quality Issues:
											</p>
											<ul className="list-inside list-disc text-xs text-red-600 dark:text-red-400">
												{validationResult.decision.qualityIssues.map((issue, idx) => (
													<li key={idx}>{issue}</li>
												))}
											</ul>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Technical Details */}
						<div className="space-y-2">
							<p className="text-muted-foreground text-xs font-medium">Verification Details</p>
							<div className="bg-muted space-y-1 rounded-lg p-3 font-mono text-xs">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Transaction ID:</span>
									<span className="font-medium">{validationResult.transactionId}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Live Face:</span>
									<span
										className={validationResult.decision.isLive ? "text-green-600" : "text-red-600"}
									>
										{validationResult.decision.liveFaceValue}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Summary Action:</span>
									<span
										className={
											validationResult.decision.actionPassed ? "text-green-600" : "text-red-600"
										}
									>
										{validationResult.decision.summaryAction}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Timestamp:</span>
									<span>{validationResult.timestamp.toLocaleString()}</span>
								</div>
							</div>
						</div>

						{/* Action Button */}
						<Button onClick={handleStartNew} className="w-full" size="lg">
							<Camera className="mr-2 h-5 w-5" />
							Verify Another Selfie
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
