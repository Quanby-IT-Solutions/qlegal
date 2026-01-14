"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { CheckCircle2, LogOut, Loader2, PlayCircle, ShieldCheck, XCircle } from "lucide-react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"

import {
	checkUserKycStatus,
	createUserKycLink,
	getExistingKycLink,
	resetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"

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

export function KycVerificationCard({
	userInfo,
	minimal,
	redirectUrlOnSkip,
}: KycVerificationCardProps) {
	const [isPending, startTransition] = useTransition()
	const [statusResult, setStatusResult] = useState<KycStatusResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [shownToasts, setShownToasts] = useState<Set<string>>(new Set())
	const searchParams = useSearchParams()

	// When verified in minimal mode, auto-redirect to dashboard after short delay
	const effectiveStatus = useMemo(
		() => statusResult?.kycStatus ?? userInfo.kycStatus,
		[statusResult, userInfo.kycStatus]
	)
	useEffect(() => {
		if (minimal && effectiveStatus === "VERIFIED" && redirectUrlOnSkip) {
			const t = setTimeout(() => {
				window.location.href = redirectUrlOnSkip
			}, 2000)
			return () => clearTimeout(t)
		}
	}, [minimal, effectiveStatus, redirectUrlOnSkip])

	// Auto-check status when in PENDING state (every 10 seconds)
	useEffect(() => {
		if (effectiveStatus !== "PENDING") return

		const checkStatus = async () => {
			const result = await checkUserKycStatus()
			if (result.success && result.data) {
				setStatusResult(result.data)

				if (result.data.kycStatus === "VERIFIED") {
					console.log("✅ KYC Verified! Redirecting to dashboard...")
					toast.success("KYC verification approved! Redirecting...")
					setTimeout(() => {
						window.location.href = "/dashboard"
					}, 1500)
				} else if (result.data.kycStatus === "REJECTED") {
					console.log("❌ KYC Rejected")
					toast.error("KYC verification was declined. Please try again or contact support.")
				}
			}
		}

		// Check immediately
		checkStatus()

		// Then check every 10 seconds
		const interval = setInterval(checkStatus, 10000)

		return () => clearInterval(interval)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [effectiveStatus])

	const handleCreateLink = () => {
		setError(null)
		setStatusResult(null)

		startTransition(async () => {
			const result = await createUserKycLink()
			if (result.success && result.data) {
				// Auto-open the KYC link
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("KYC verification link created! Opening in new window...")

				// User completes KYC in new window, then redirects back with ?status=complete
				// Single status check will happen automatically when they return
				console.log("✅ KYC link created. Waiting for user to complete verification...")
			} else {
				setError(result.error ?? "Failed to create KYC link")
				toast.error(result.error ?? "Failed to create KYC link")
			}
		})
	}

	const handleResumeVerification = () => {
		setError(null)

		startTransition(async () => {
			const result = await getExistingKycLink()
			if (result.success && result.data) {
				// Open the stored KYC link
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("Resuming KYC verification...")
				console.log("🔄 Resuming KYC verification with transaction:", result.data.transactionId)
			} else {
				setError(result.error ?? "Failed to resume KYC verification")
				toast.error(result.error ?? "Failed to resume KYC verification")
			}
		})
	}

	const handleLogout = () => {
		// Clear KYC skip session cookie before logout
		document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
		signOut({ callbackUrl: "/auth/login" })
	}

	// No polling - following HyperVerge best practices
	// Webhook handles real-time updates, manual check is fallback only

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
	const currentStatus = statusResult?.kycStatus ?? userInfo.kycStatus ?? "NOT_STARTED"

	return (
		<div className="space-y-6">
			{/* Status Badge - Only show in non-minimal or if not NOT_STARTED */}
			{(!minimal || currentStatus !== "NOT_STARTED") && (
				<div className="flex items-center justify-center">{getStatusBadge(currentStatus)}</div>
			)}

			{/* Account Information - Only show in non-minimal mode */}
			{!minimal && (
				<div className="space-y-2">
					<Label>Account Information</Label>
					<div className="bg-muted space-y-2 rounded-lg p-4">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Name:</span>
							<span className="font-medium">{userInfo.name ?? "N/A"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Email:</span>
							<span className="font-medium">{userInfo.email ?? "N/A"}</span>
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

			{/* NOT_STARTED State */}
			{currentStatus === "NOT_STARTED" && (
				<div className="space-y-4">
					{!minimal && (
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
							<p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
								Identity Verification Required
							</p>
							<p className="text-sm text-blue-700 dark:text-blue-300">
								To ensure security and compliance, all users must complete identity verification
								before accessing platform features. This process takes just a few minutes.
							</p>
						</div>
					)}
					{minimal && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/20">
							<p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
								Verification Required
							</p>
							<p className="text-xs text-amber-700 dark:text-amber-300">
								Complete your identity verification to continue
							</p>
						</div>
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
				</div>
			)}

			{/* PENDING State */}
			{currentStatus === "PENDING" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
						<div className="flex items-start gap-3">
							<Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
							<div className="flex-1">
								<p className="mb-1 font-medium text-blue-900 dark:text-blue-100">
									Verification In Progress
								</p>
								<p className="text-sm text-blue-700 dark:text-blue-300">
									We&apos;re reviewing your identity documents. This usually takes a few minutes.
								</p>
								<p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
									You&apos;ll be automatically redirected when your verification is complete.
									You can resume the verification or log out below.
								</p>
							</div>
						</div>
					</div>
					<div className="grid gap-3">
						<Button
							onClick={handleResumeVerification}
							disabled={isPending}
							variant="default"
							className="w-full"
							size="lg"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading...
								</>
							) : (
								<>
									<PlayCircle className="mr-2 h-5 w-5" />
									Resume Verification
								</>
							)}
						</Button>
						<Button
							onClick={handleLogout}
							disabled={isPending}
							variant="ghost"
							className="w-full"
						>
							<LogOut className="mr-2 h-4 w-4" />
							Log Out
						</Button>
					</div>
				</div>
			)}

			{/* VERIFIED State */}
			{currentStatus === "VERIFIED" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
							<div className="flex-1">
								<p className="mb-1 text-lg font-semibold text-green-900 dark:text-green-100">
									✓ Verification Complete!
								</p>
								<p className="text-sm text-green-700 dark:text-green-300">
									Your identity has been successfully verified. You now have full access to all
									platform features.
								</p>
							</div>
						</div>
					</div>
					<Button
						onClick={() => (window.location.href = redirectUrlOnSkip ?? "/dashboard")}
						className="w-full"
						variant="default"
						size="lg"
						type="button"
					>
						<CheckCircle2 className="mr-2 h-5 w-5" />
						Continue to Dashboard
					</Button>
				</div>
			)}

			{/* REJECTED State */}
			{currentStatus === "REJECTED" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
						<div className="flex items-start gap-3">
							<XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
							<div className="flex-1">
								<p className="mb-1 font-medium text-red-900 dark:text-red-100">
									Verification Not Approved
								</p>
								<p className="mb-2 text-sm text-red-700 dark:text-red-300">
									Your identity verification was not approved. This could be due to unclear
									documents or mismatched information.
								</p>
								<p className="text-xs text-red-600 dark:text-red-400">
									Please ensure your ID is clear, well-lit, and all information is visible before
									retrying.
								</p>
							</div>
						</div>
					</div>
					<Button
						onClick={async () => {
							if (confirm("Start a new verification? Your previous attempt will be cleared.")) {
								const result = await resetUserKycStatus()
								if (result.success) {
									toast.success("Ready to start new verification")
									window.location.reload()
								} else {
									toast.error(result.error ?? "Failed to reset. Please contact support.")
								}
							}
						}}
						disabled={isPending}
						variant="default"
						size="lg"
						className="w-full"
					>
						<ShieldCheck className="mr-2 h-5 w-5" />
						Try Again with New Documents
					</Button>
				</div>
			)}

			{/* Status Details - Only in non-minimal mode */}
			{!minimal && statusResult && (
				<div className="space-y-4 border-t pt-4">
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
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
					<div className="flex items-start gap-3">
						<XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
						<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
					</div>
				</div>
			)}
		</div>
	)
}
