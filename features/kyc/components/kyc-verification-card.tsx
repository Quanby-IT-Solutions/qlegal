"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { CheckCircle2, Loader2, PlayCircle, ShieldCheck, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { resetUserKycStatus } from "@/features/kyc/api/kyc.actions"
import { useHyperVergeSDK } from "@/features/kyc/hooks/use-hyperverge-sdk"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"

interface KycVerificationCardProps {
	userInfo: {
		name: string | null
		email: string | null
		transactionId: string | null
		kycStatus: string | null
		kycLinkCreatedAt?: Date | null
		hasHostedLink?: boolean
		sessionType?: "hosted" | "direct" | null
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
	const [error, setError] = useState<string | null>(null)
	const [showManualCheck, setShowManualCheck] = useState(false)
	const toastShownRef = useRef<Set<string>>(new Set())

	const { launch: launchSdk, isLoading: isLaunchingSdk } = useHyperVergeSDK({
		redirectOnSuccess: "/dashboard",
		onComplete: () => {
			void refetch()
		},
	})

	// Check if there's an expired link (24 hours old)
	const hasExpiredLink = useMemo(() => {
		if (userInfo.kycStatus === "PENDING" && userInfo.kycLinkCreatedAt) {
			const linkAge = Date.now() - new Date(userInfo.kycLinkCreatedAt).getTime()
			const expirationTime = 24 * 60 * 60 * 1000 // 24 hours
			return linkAge > expirationTime
		}
		return false
	}, [userInfo.kycStatus, userInfo.kycLinkCreatedAt])

	// Determine effective status from either server data or query result
	const effectiveStatus = useMemo(() => userInfo.kycStatus, [userInfo.kycStatus])

	// Option 1.5: Single check on mount, no polling
	// Webhook handles real-time updates (primary method)
	const {
		data: statusQueryResult,
		refetch,
		isCheckingStatus,
	} = useKycStatus({
		currentStatus: effectiveStatus,
		enabled: true,
	})

	const statusResult = statusQueryResult?.success ? statusQueryResult.data : null
	const isStatusLoading = isCheckingStatus
	const isNeedsReview = statusResult?.needsReview ?? statusResult?.status === "needs_review"

	// Cross-tab communication: Listen for verification events from other tabs (0 API calls)
	const { listen, isSupported } = useKycBroadcast()

	useEffect(() => {
		if (effectiveStatus === "PENDING") {
			const unsubscribe = listen(message => {
				if (message.type === "KYC_VERIFIED") {
					console.log("📨 Received KYC_VERIFIED from other tab - redirecting...")
					toast.success("KYC verified! Redirecting...")
					setTimeout(() => {
						window.location.href = "/dashboard"
					}, 500)
				}
			})

			return unsubscribe
		}
	}, [effectiveStatus, listen])

	// Fallback: Check status on window focus if BroadcastChannel not supported (max 1 extra call)
	useEffect(() => {
		if (effectiveStatus === "PENDING" && !isSupported()) {
			const handleFocus = () => {
				console.log("🔍 Window focused - checking status (fallback)")
				void refetch()
			}

			window.addEventListener("focus", handleFocus)
			return () => window.removeEventListener("focus", handleFocus)
		}
	}, [effectiveStatus, isSupported, refetch])

	// Show manual check button after 5 seconds if still PENDING
	useEffect(() => {
		if (effectiveStatus === "PENDING" && !showManualCheck) {
			const timer = setTimeout(() => {
				setShowManualCheck(true)
			}, 5000) // 5 seconds
			return () => clearTimeout(timer)
		}
	}, [effectiveStatus, showManualCheck])

	// When verified in minimal mode, auto-redirect to dashboard after short delay
	useEffect(() => {
		if (minimal && effectiveStatus === "VERIFIED" && redirectUrlOnSkip) {
			const t = setTimeout(() => {
				window.location.href = redirectUrlOnSkip
			}, 2000)
			return () => clearTimeout(t)
		}
	}, [minimal, effectiveStatus, redirectUrlOnSkip])

	// Show toast notifications when status changes (only once per status)
	useEffect(() => {
		if (!statusResult) return

		const toastKey = `${statusResult.kycStatus}-${statusResult.transactionId}`

		if (statusResult.kycStatus === "VERIFIED" && !toastShownRef.current.has(toastKey)) {
			toastShownRef.current.add(toastKey)
			console.log("✅ KYC Verified! Redirecting to dashboard...")
			toast.success("KYC verification approved! Redirecting...")
			setTimeout(() => {
				window.location.href = "/dashboard"
			}, 1500)
		} else if (statusResult.kycStatus === "REJECTED" && !toastShownRef.current.has(toastKey)) {
			toastShownRef.current.add(toastKey)
			console.log("❌ KYC Rejected")
			const autoDeclined = statusResult.status === "auto_declined"
			toast.error(
				autoDeclined
					? "Your KYC verification was automatically declined by our verification provider. Please try again with clearer documents or contact support."
					: "KYC verification was declined. Please try again or contact support."
			)
		}
	}, [statusResult])

	const handleStartVerification = () => {
		setError(null)
		void launchSdk()
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
			case "NEEDS_REVIEW":
				return (
					<Badge variant="secondary">
						<Loader2 className="mr-1 h-3 w-3 animate-spin" />
						Needs manual review
					</Badge>
				)
			case "NOT_STARTED":
				return <Badge variant="outline">Not Started</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	// Show existing status if available
	// If there's an expired PENDING link, treat it as NOT_STARTED for UI purposes
	const rawStatus = statusResult?.kycStatus ?? userInfo.kycStatus ?? "NOT_STARTED"
	const normalizedStatus =
		isNeedsReview && rawStatus !== "VERIFIED" && rawStatus !== "REJECTED"
			? "NEEDS_REVIEW"
			: rawStatus
	const currentStatus =
		hasExpiredLink && normalizedStatus === "PENDING" ? "NOT_STARTED" : normalizedStatus
	const showStatusLoadingBanner =
		isStatusLoading && (currentStatus === "PENDING" || currentStatus === "NOT_STARTED")

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

			{/* Status Loading Banner */}
			{showStatusLoadingBanner && (
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/20">
					<div className="flex items-center gap-2">
						<Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
						<p className="text-blue-800 dark:text-blue-100">
							Checking your verification status. This should only take a moment.
						</p>
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
					{hasExpiredLink && (
						<div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
							<p className="text-xs text-orange-700 dark:text-orange-300">
								Your previous verification link has expired. Creating a new link for you.
							</p>
						</div>
					)}
					<div className="grid gap-3">
						<Button
							onClick={handleStartVerification}
							disabled={isLaunchingSdk || isStatusLoading}
							className="w-full"
							size="lg"
						>
							{isStatusLoading ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Checking verification status…
								</>
							) : (
								<>
									<ShieldCheck className="mr-2 h-5 w-5" />
									Start verification
								</>
							)}
						</Button>
					</div>
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
								</p>
							</div>
						</div>
					</div>

					<div className="grid gap-3">
						<Button
							onClick={handleStartVerification}
							disabled={isLaunchingSdk}
							variant="default"
							className="w-full"
							size="lg"
						>
							<PlayCircle className="mr-2 h-5 w-5" />
							Resume verification
						</Button>
					</div>
				</div>
			)}

			{/* NEEDS_REVIEW State */}
			{currentStatus === "NEEDS_REVIEW" && (
				<div className="space-y-4">
					<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
						<div className="flex items-start gap-3">
							<Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-yellow-600 dark:text-yellow-400" />
							<div className="flex-1">
								<p className="mb-1 font-medium text-yellow-900 dark:text-yellow-100">
									Verification under manual review
								</p>
								<p className="text-sm text-yellow-800 dark:text-yellow-200">
									Your documents have been submitted and are currently being reviewed by our team
									and our verification partner. This may take longer than automated checks.
								</p>
								<p className="mt-2 text-xs text-yellow-800/80 dark:text-yellow-200/80">
									You don&apos;t need to start a new verification. We&apos;ll notify you once the
									review is complete.
								</p>
							</div>
						</div>
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
								{statusResult?.status === "auto_declined" && (
									<p className="mb-2 text-xs text-red-700/90 dark:text-red-300/90">
										Our verification provider automatically declined this attempt based on its
										automated checks. Please review your documents and try again, or contact support
										if you believe this is an error.
									</p>
								)}
								{statusResult?.status !== "auto_declined" && (
									<p className="mb-2 text-xs text-red-700/90 dark:text-red-300/90">
										Your verification was declined after manual review. Please try again or contact
										support.
									</p>
								)}
								<p className="text-xs text-red-600 dark:text-red-400">
									Please ensure your ID is clear, well-lit, and all information is visible before
									retrying.
								</p>
							</div>
						</div>
					</div>
					<Button
						onClick={() => {
							if (confirm("Start a new verification? Your previous attempt will be cleared.")) {
								startTransition(async () => {
									const result = await resetUserKycStatus()
									if (result.success) {
										toast.success("Ready to start new verification")
										window.location.reload()
									} else {
										toast.error(result.error ?? "Failed to reset. Please contact support.")
									}
								})
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
