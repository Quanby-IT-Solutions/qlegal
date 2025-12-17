"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"

import { checkUserKycStatus, createUserKycLink, resetUserKycStatus } from "@/features/kyc/api/kyc.actions"

interface KycLinkResult {
	transactionId: string
	url: string
}

interface KycStatusResult {
	transactionId: string
	status: string
	kycStatus: "PENDING" | "VERIFIED" | "REJECTED"
	isComplete: boolean
	isApproved: boolean
	needsReview: boolean
	message: string
	details?: Record<string, unknown>
}

interface KycVerificationCardProps {
	userInfo: {
		name: string | null
		email: string | null
		transactionId: string | null
		kycStatus: string | null
	}
	minimal?: boolean
	redirectUrlOnSkip?: string
}

export function KycVerificationCard({ userInfo, minimal, redirectUrlOnSkip }: KycVerificationCardProps) {
	const [isPending, startTransition] = useTransition()
	const [linkResult, setLinkResult] = useState<KycLinkResult | null>(null)
	const [statusResult, setStatusResult] = useState<KycStatusResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [polling, setPolling] = useState(false)
	const [pollId, setPollId] = useState<number | null>(null)
	const searchParams = useSearchParams()

	// Auto-poll interval (5 seconds)
	const pollIntervalMs = 5000

	const handleSkip = () => {
		console.log("handleSkip called, redirectUrlOnSkip:", redirectUrlOnSkip)
		if (redirectUrlOnSkip) {
			console.log("Redirecting to:", redirectUrlOnSkip)
			// Set a SESSION cookie (no max-age = expires when browser closes)
			// This allows temporary access but prompts KYC on next session
			document.cookie = "skipKycSession=true; path=/; SameSite=Lax"
			window.location.href = redirectUrlOnSkip
		} else {
			console.error("No redirectUrlOnSkip provided")
		}
	}

	// When verified in minimal mode, auto-redirect to dashboard after short delay
	const effectiveStatus = useMemo(() => statusResult?.kycStatus || userInfo.kycStatus, [statusResult, userInfo.kycStatus])
	useEffect(() => {
		if (minimal && effectiveStatus === "VERIFIED" && redirectUrlOnSkip) {
			const t = setTimeout(() => {
				window.location.href = redirectUrlOnSkip
			}, 2000)
			return () => clearTimeout(t)
		}
	}, [minimal, effectiveStatus, redirectUrlOnSkip])

	// Check if user completed KYC (from redirect) or has pending status
	useEffect(() => {
		const status = searchParams.get("status")
		// Auto-check status when redirected from HyperVerge or when status is PENDING
		if ((status === "complete" || userInfo.kycStatus === "PENDING") && userInfo.transactionId) {
			// Wait longer if just completed (from redirect) to allow HyperVerge to process
			const delay = status === "complete" ? 5000 : 2000
			console.log(`⏳ Will check KYC status in ${delay}ms...`)
			
			const timer = setTimeout(() => {
				console.log("🔍 Auto-checking KYC status now...")
				handleCheckStatus()
			}, delay)
			return () => clearTimeout(timer)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, userInfo.transactionId, userInfo.kycStatus])

	const handleCreateLink = () => {
		setError(null)
		setLinkResult(null)
		setStatusResult(null)

		startTransition(async () => {
			const result = await createUserKycLink()
			if (result.success && result.data) {
				setLinkResult(result.data)
				// Auto-open the KYC link
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("KYC verification link created! Opening in new window...")

				// Start auto-polling
				startPolling(result.data.transactionId)
			} else {
				setError(result.error || "Failed to create KYC link")
				toast.error(result.error || "Failed to create KYC link")
			}
		})
	}

	const handleCheckStatus = () => {
		setError(null)

		startTransition(async () => {
			const result = await checkUserKycStatus()
			if (result.success && result.data) {
				setStatusResult(result.data)
				// Stop polling if complete or decided
				if (
					result.data.isComplete ||
					result.data.isApproved ||
					result.data.kycStatus === "VERIFIED" ||
					result.data.kycStatus === "REJECTED"
				) {
					stopPolling()
					if (result.data.isApproved) {
						toast.success("KYC verification approved!")
					}
				}
			} else {
				setError(result.error || "Failed to check KYC status")
				toast.error(result.error || "Failed to check KYC status")
			}
		})
	}

	const startPolling = (transactionId: string) => {
		if (polling) return
		setPolling(true)
		const id = window.setInterval(async () => {
			const result = await checkUserKycStatus()
			if (result.success && result.data) {
				setStatusResult(result.data)
				if (
					result.data.isComplete ||
					result.data.isApproved ||
					result.data.kycStatus === "VERIFIED" ||
					result.data.kycStatus === "REJECTED"
				) {
					stopPolling()
				}
			} else {
				stopPolling()
			}
		}, pollIntervalMs)
		setPollId(id)
	}

	const stopPolling = () => {
		if (pollId) {
			window.clearInterval(pollId)
			setPollId(null)
		}
		setPolling(false)
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "VERIFIED":
			case "auto_approved":
				return "text-green-600 bg-green-50 border-green-200"
			case "REJECTED":
			case "auto_declined":
				return "text-red-600 bg-red-50 border-red-200"
			case "PENDING":
			case "needs_review":
				return "text-yellow-600 bg-yellow-50 border-yellow-200"
			case "NOT_STARTED":
				return "text-gray-600 bg-gray-50 border-gray-200"
			default:
				return "text-blue-600 bg-blue-50 border-blue-200"
		}
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "VERIFIED":
				return (
					<Badge className="bg-green-100 text-green-800">
						<CheckCircle2 className="mr-1 h-3 w-3" />
						Verified
					</Badge>
				)
			case "REJECTED":
				return (
					<Badge variant="destructive">
						<XCircle className="mr-1 h-3 w-3" />
						Rejected
					</Badge>
				)
			case "PENDING":
				return (
					<Badge variant="secondary">
						<Loader2 className="mr-1 h-3 w-3 animate-spin" />
						Pending
					</Badge>
				)
			case "NOT_STARTED":
				return <Badge variant="outline">Not Started</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	// Show existing status if available
	const currentStatus = statusResult?.kycStatus || userInfo.kycStatus || "NOT_STARTED"
	const hasExistingVerification = userInfo.transactionId && userInfo.kycStatus !== "NOT_STARTED"

	return (
		<div className="space-y-6">
			{/* Status Badge - Only show in non-minimal or if not NOT_STARTED */}
			{(!minimal || currentStatus !== "NOT_STARTED") && (
				<div className="flex items-center justify-center">
					{getStatusBadge(currentStatus)}
				</div>
			)}

			{/* Account Information - Only show in non-minimal mode */}
			{!minimal && (
				<div className="space-y-2">
					<Label>Account Information</Label>
					<div className="bg-muted rounded-lg p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Name:</span>
							<span className="font-medium">{userInfo.name || "N/A"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Email:</span>
							<span className="font-medium">{userInfo.email || "N/A"}</span>
						</div>
						{userInfo.transactionId && (
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Transaction ID:</span>
								<span className="font-mono text-xs">{userInfo.transactionId}</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Development Helper - Reset KYC */}
			{process.env.NODE_ENV === "development" && currentStatus !== "NOT_STARTED" && (
				<div className="pt-2 border-t">
					<Button
						onClick={async () => {
							if (confirm("Reset KYC status? This will clear your current verification.")) {
								const result = await resetUserKycStatus()
								if (result.success) {
									toast.success("KYC status reset successfully")
									window.location.reload()
								} else {
									toast.error(result.error || "Failed to reset")
								}
							}
						}}
						variant="ghost"
						size="sm"
						className="w-full text-xs text-muted-foreground"
					>
						[Dev] Reset KYC Status
					</Button>
				</div>
			)}

			{/* NOT_STARTED State */}
			{currentStatus === "NOT_STARTED" && (
				<div className="space-y-4">
					{!minimal && (
						<p className="text-muted-foreground text-sm text-center">
							You haven&apos;t completed your KYC verification yet. Click the button below to
							start the verification process.
						</p>
					)}
					<Button onClick={handleCreateLink} disabled={isPending} className="w-full" size="lg">
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating Link...
							</>
						) : (
							<>
								<ShieldCheck className="mr-2 h-5 w-5" />
								Start Verification
							</>
						)}
					</Button>
					{minimal && redirectUrlOnSkip && (
						<Button onClick={handleSkip} variant="ghost" className="w-full" type="button">
							Skip for now
						</Button>
					)}
				</div>
			)}

			{/* PENDING State */}
			{currentStatus === "PENDING" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
						<div className="flex items-start gap-3">
							<Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-medium text-blue-900 dark:text-blue-100">Verification In Progress</p>
								<p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
									Complete the verification process in the HyperVerge window, then click the button below to check your status.
								</p>
							</div>
						</div>
					</div>
					{/* <Button onClick={handleCheckStatus} disabled={isPending} className="w-full" size="lg">
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Checking Status...
							</>
						) : (
							<>
								<ShieldCheck className="mr-2 h-5 w-5" />
								Check Verification Status
							</>
						)}
					</Button> */}
					{polling && (
						<p className="text-muted-foreground text-center text-xs">
							Auto-checking every {pollIntervalMs / 1000} seconds...
						</p>
					)}
				</div>
			)}

			{/* VERIFIED State */}
			{currentStatus === "VERIFIED" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-medium text-green-900 dark:text-green-100">Verification Complete</p>
								<p className="text-green-700 dark:text-green-300 text-sm mt-1">
									Your identity has been successfully verified.{" "}
									{minimal
										? "Redirecting to your dashboard..."
										: "You now have full access to all platform features."}
								</p>
							</div>
						</div>
					</div>
					{minimal && redirectUrlOnSkip && (
						<Button onClick={handleSkip} className="w-full" variant="default" size="lg" type="button">
							Continue to Dashboard
						</Button>
					)}
				</div>
			)}

			{/* REJECTED State */}
			{currentStatus === "REJECTED" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
						<div className="flex items-start gap-3">
							<XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-medium text-red-900 dark:text-red-100">Verification Failed</p>
								<p className="text-red-700 dark:text-red-300 text-sm mt-1">
									Your KYC verification was not approved. Please try again with valid
									identification documents.
								</p>
							</div>
						</div>
					</div>
					<Button
						onClick={async () => {
							const result = await resetUserKycStatus()
							if (result.success) {
								toast.success("KYC status reset. You can start a new verification.")
								window.location.reload()
							} else {
								toast.error(result.error || "Failed to reset KYC status")
							}
						}}
						disabled={isPending}
						variant="outline"
						size="lg"
						className="w-full"
					>
						Reset and Start New Verification
					</Button>
				</div>
			)}

			{/* Status Details - Only in non-minimal mode */}
			{!minimal && statusResult && (
				<div className="space-y-4 pt-4 border-t">
					<Label className="text-base font-semibold">Verification Details</Label>
					<div className={`rounded-lg border p-4 ${getStatusColor(statusResult.status)}`}>
						<p className="font-semibold capitalize">
							Status: {statusResult.status.replace(/_/g, " ")}
						</p>
						<p className="mt-1 text-sm">{statusResult.message}</p>
					</div>

					{statusResult.details && Object.keys(statusResult.details).length > 0 && (
						<div className="space-y-2">
							<Label>Additional Details</Label>
							<pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">
								{JSON.stringify(statusResult.details, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
					<div className="flex items-start gap-3">
						<XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						<p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
					</div>
				</div>
			)}
		</div>
	)
}
