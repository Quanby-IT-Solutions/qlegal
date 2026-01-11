"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { getHostedLivenessResult } from "@/features/liveness-validation/api/liveness.actions"

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
}

export default function LivenessCallbackPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(true)
	const [result, setResult] = useState<ValidationResult | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const transactionId = searchParams.get("transactionId")

		if (!transactionId) {
			setError("Missing transaction ID in callback URL")
			setIsLoading(false)
			toast.error("Invalid callback: Missing transaction ID")
			return
		}

		// Fetch results from server
		const fetchResults = async () => {
			try {
				console.log("🔵 Fetching liveness results for transaction:", transactionId)

				const response = await getHostedLivenessResult(transactionId)

				if (!response.success) {
					throw new Error(response.error ?? "Failed to fetch results")
				}

				if (!response.data) {
					throw new Error("No data returned from server")
				}

				setResult(response.data as ValidationResult)

				// Show toast notification
				if (response.data.decision.isApproved) {
					toast.success("Liveness verification successful!")
				} else {
					toast.error("Liveness verification failed")
				}
			} catch (err) {
				console.error("Failed to fetch liveness results:", err)
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch verification results"
				setError(errorMessage)
				toast.error(errorMessage)
			} finally {
				setIsLoading(false)
			}
		}

		void fetchResults()
	}, [searchParams])

	const handleBackToHome = () => {
		router.push("/liveness")
	}

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-2xl p-6">
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
							<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						</div>
						<CardTitle>Processing Verification Results</CardTitle>
						<CardDescription>
							Please wait while we retrieve your liveness verification results...
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl p-6">
				<Card className="border-destructive">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
							<XCircle className="h-8 w-8 text-red-600" />
						</div>
						<CardTitle className="text-destructive">Error</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<Button onClick={handleBackToHome}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Liveness Verification
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!result) {
		return (
			<div className="container mx-auto max-w-2xl p-6">
				<Card>
					<CardHeader className="text-center">
						<CardTitle>No Results Available</CardTitle>
						<CardDescription>Unable to retrieve verification results</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<Button onClick={handleBackToHome}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Liveness Verification
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const { decision } = result
	const isApproved = decision.isApproved

	return (
		<div className="container mx-auto max-w-2xl p-6">
			<Card className={isApproved ? "border-green-500" : "border-destructive"}>
				<CardHeader className="text-center">
					<div
						className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
							isApproved ? "bg-green-100" : "bg-red-100"
						}`}
					>
						{isApproved ? (
							<CheckCircle2 className="h-8 w-8 text-green-600" />
						) : (
							<XCircle className="h-8 w-8 text-red-600" />
						)}
					</div>
					<CardTitle className={isApproved ? "text-green-600" : "text-destructive"}>
						{isApproved ? "Verification Successful" : "Verification Failed"}
					</CardTitle>
					<CardDescription className="mt-2 text-base">{decision.message}</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{/* Status */}
					<div className="flex items-center justify-between rounded-lg border p-4">
						<span className="text-sm font-medium">Status</span>
						<Badge variant={isApproved ? "default" : "destructive"} className="text-sm">
							{result.status}
						</Badge>
					</div>

					{/* Transaction ID */}
					<div className="rounded-lg border p-4">
						<div className="text-muted-foreground text-sm font-medium">Transaction ID</div>
						<div className="mt-1 font-mono text-sm">{result.transactionId}</div>
					</div>

					{/* Decision Details */}
					<div className="space-y-3 rounded-lg border p-4">
						<div className="text-sm font-medium">Verification Details</div>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Live Face Detected</span>
								<Badge variant={decision.isLive ? "default" : "secondary"}>
									{decision.liveFaceValue}
								</Badge>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Action Status</span>
								<Badge variant={decision.actionPassed ? "default" : "secondary"}>
									{decision.summaryAction}
								</Badge>
							</div>
						</div>
					</div>

					{/* Quality Issues */}
					{decision.qualityIssues.length > 0 && (
						<div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<div className="text-sm font-medium text-yellow-900">Quality Issues Detected</div>
							<ul className="list-inside list-disc space-y-1 text-sm text-yellow-800">
								{decision.qualityIssues.map((issue, index) => (
									<li key={index}>{issue}</li>
								))}
							</ul>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-3">
						<Button onClick={handleBackToHome} className="flex-1">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Liveness
						</Button>
						{isApproved && (
							<Button
								variant="outline"
								onClick={() => router.push("/dashboard")}
								className="flex-1"
							>
								Go to Dashboard
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
