"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
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

import { useLivenessResult } from "@/features/liveness-validation/hooks/use-liveness-result"

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
	const transactionId = searchParams.get("transactionId")
	const redirectUrl = searchParams.get("redirect")
	const meetingId = searchParams.get("meetingId")
	const toastShownRef = useRef(false)

	// Use TanStack Query hook to fetch results with automatic deduplication
	// This prevents multiple API calls even if the component re-renders
	const {
		data: response,
		isLoading,
		error: queryError,
	} = useLivenessResult({
		transactionId,
		meetingId,
		enabled: !!transactionId,
	})

	// Toast + seamless redirect when we have result (no confirmation page)
	useEffect(() => {
		if (response?.success && response.data && !toastShownRef.current) {
			toastShownRef.current = true
			if (response.data.decision.isApproved) {
				toast.success("Verification complete!")
				if (redirectUrl) {
					window.location.href = redirectUrl
				}
			} else {
				toast.error("Verification failed")
				if (redirectUrl && meetingId) {
					window.location.href = `/liveness?redirect=${encodeURIComponent(redirectUrl)}&meetingId=${meetingId}`
				}
			}
		} else if (queryError && !toastShownRef.current) {
			toastShownRef.current = true
			toast.error(
				queryError instanceof Error ? queryError.message : "Failed to fetch verification results"
			)
		} else if (!transactionId && !toastShownRef.current) {
			toastShownRef.current = true
			toast.error("Invalid callback: Missing transaction ID")
		}
	}, [response, queryError, transactionId, redirectUrl, meetingId, router])

	const result = response?.success ? (response.data as ValidationResult) : null
	const error = queryError
		? queryError instanceof Error
			? queryError.message
			: "Failed to fetch verification results"
		: !transactionId
			? "Missing transaction ID in callback URL"
			: response && !response.success
				? (response.error ?? "Failed to fetch results")
				: null

	const handleBackToHome = () => {
		router.push("/liveness")
	}

	// Minimal flat "Verifying..." (matches liveness page)
	if (isLoading) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4">
				<div className="text-center">
					<Loader2 className="text-primary mx-auto mb-4 h-10 w-10 animate-spin" />
					<p className="text-muted-foreground text-sm">Verifying...</p>
				</div>
			</div>
		)
	}

	// When we have redirectUrl: skip confirmation, useEffect already toasts + redirects. Show minimal "Redirecting..." only briefly.
	if (result && redirectUrl) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4">
				<div className="text-center">
					<Loader2 className="text-primary mx-auto mb-4 h-10 w-10 animate-spin" />
					<p className="text-muted-foreground text-sm">
						{result.decision.isApproved
							? "Redirecting to meeting..."
							: "Taking you back to try again..."}
					</p>
				</div>
			</div>
		)
	}

	// Error: minimal + back
	if (error) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4">
				<div className="w-full max-w-md space-y-4 text-center">
					<div className="bg-destructive/10 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
						<XCircle className="text-destructive h-7 w-7" />
					</div>
					<p className="text-sm font-medium">Something went wrong</p>
					<p className="text-muted-foreground text-sm">{error}</p>
					<Button variant="outline" size="sm" onClick={() => router.push("/meetings")}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Meetings
					</Button>
				</div>
			</div>
		)
	}

	// No result (no redirectUrl path)
	if (!result) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4">
				<div className="w-full max-w-md space-y-4 text-center">
					<p className="text-muted-foreground text-sm">Unable to retrieve verification results</p>
					<Button variant="outline" size="sm" onClick={handleBackToHome}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Liveness
					</Button>
				</div>
			</div>
		)
	}

	// Full result card only when NO redirectUrl (e.g. user opened /liveness directly)
	const { decision } = result
	const isApproved = decision.isApproved

	return (
		<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4 py-10">
			<div className="w-full max-w-2xl">
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
						<div className="flex items-center justify-between rounded-lg border p-4">
							<span className="text-sm font-medium">Status</span>
							<Badge variant={isApproved ? "default" : "destructive"} className="text-sm">
								{result.status}
							</Badge>
						</div>

						<div className="rounded-lg border p-4">
							<div className="text-muted-foreground text-sm font-medium">Transaction ID</div>
							<div className="mt-1 font-mono text-sm">{result.transactionId}</div>
						</div>

						<div className="flex gap-3">
							<Button onClick={handleBackToHome} className="flex-1">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Liveness
							</Button>
							{isApproved && (
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => router.push("/dashboard")}
								>
									Go to Dashboard
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
