"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
	AlertCircle,
	Ban,
	CheckCircle2,
	Clock,
	Loader2,
	Shield,
	ShieldAlert,
	ShieldCheck,
	XCircle,
	type LucideIcon,
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"
import { kycExpiryRenewalDescription } from "@/core/lib/kyc-reverification-copy"
import { cn } from "@/core/lib/utils"

import { getUserKycInfoRequest } from "@/features/kyc/api/kyc-client"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"
import { useStartKycVerification } from "@/features/kyc/hooks/use-start-kyc-verification"

/** Prefer the strongest status when JWT, status check, and DB disagree (e.g. stale TanStack cache). */
function resolveDisplayKycStatus(...sources: (string | undefined | null)[]): string {
	const rank: Record<string, number> = {
		VERIFIED: 4,
		PENDING: 3,
		REJECTED: 2,
		NOT_STARTED: 1,
	}
	let best = "NOT_STARTED"
	let bestRank = 0
	for (const source of sources) {
		if (!source) continue
		const r = rank[source] ?? 0
		if (r > bestRank) {
			bestRank = r
			best = source
		}
	}
	return best
}

function kycStatusMeta(status: string): {
	label: string
	badgeVariant: "default" | "secondary" | "outline" | "destructive"
	StatusIcon: LucideIcon
	badgeClassName: string
	iconWrapClassName: string
} {
	switch (status) {
		case "VERIFIED":
			return {
				label: "Verified",
				badgeVariant: "outline",
				StatusIcon: CheckCircle2,
				badgeClassName:
					"border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
				iconWrapClassName:
					"border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
			}
		case "NEEDS_REVIEW":
			return {
				label: "Needs review",
				badgeVariant: "outline",
				StatusIcon: ShieldAlert,
				badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
				iconWrapClassName:
					"border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
			}
		case "PENDING_LOADING":
			return {
				label: "Checking status…",
				badgeVariant: "outline",
				StatusIcon: Loader2,
				badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
				iconWrapClassName:
					"border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
			}
		case "PENDING":
			return {
				label: "In progress",
				badgeVariant: "outline",
				StatusIcon: Clock,
				badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
				iconWrapClassName:
					"border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
			}
		case "MANUAL_DECLINED":
			return {
				label: "Manually declined",
				badgeVariant: "destructive",
				StatusIcon: XCircle,
				badgeClassName: "",
				iconWrapClassName:
					"border-destructive/25 bg-gradient-to-br from-destructive/15 to-destructive/5 text-destructive",
			}
		case "AUTO_DECLINED":
			return {
				label: "Automatically declined",
				badgeVariant: "destructive",
				StatusIcon: Ban,
				badgeClassName: "",
				iconWrapClassName:
					"border-destructive/25 bg-gradient-to-br from-destructive/15 to-destructive/5 text-destructive",
			}
		case "REJECTED":
			return {
				label: "Denied",
				badgeVariant: "destructive",
				StatusIcon: AlertCircle,
				badgeClassName: "",
				iconWrapClassName:
					"border-destructive/25 bg-gradient-to-br from-destructive/15 to-destructive/5 text-destructive",
			}
		case "NOT_STARTED":
		default:
			return {
				label: "Not started",
				badgeVariant: "outline",
				StatusIcon: Shield,
				badgeClassName: "border-border/80 bg-muted/40 text-foreground/90",
				iconWrapClassName:
					"border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary",
			}
	}
}

export function IdentityVerificationCard() {
	const queryClient = useQueryClient()
	const { update: updateSession } = useSession()
	const { start, isLoading } = useStartKycVerification()
	const { listen } = useKycBroadcast()

	const { data: kycInfoResult } = useQuery({
		queryKey: ["user-kyc-info"],
		queryFn: () => getUserKycInfoRequest(),
		staleTime: 60_000,
	})
	const userInfo = kycInfoResult?.success ? kycInfoResult.data : undefined
	const validityDays = userInfo?.kycVerificationValidityDays ?? 14

	const { data: statusQueryResult, isCheckingStatus } = useKycStatus({
		currentStatus: userInfo?.kycStatus ?? "NOT_STARTED",
		enabled: true,
	})
	const statusResult = statusQueryResult?.success ? statusQueryResult.data : null
	const isNeedsReview =
		Boolean(statusResult?.needsReview) || statusResult?.status === "needs_review"

	// DB + status check + JWT can disagree after expiry re-verify; never let stale NOT_STARTED hide VERIFIED.
	const effectiveKycStatus = resolveDisplayKycStatus(
		userInfo?.kycStatus,
		statusResult?.kycStatus
	)
	const isExpiryRenewal =
		effectiveKycStatus === "NOT_STARTED" && Boolean(userInfo?.kycLastExpiredAt)

	const rawFromApi = effectiveKycStatus

	useEffect(() => {
		const unsubscribe = listen(message => {
			if (
				message.type !== "KYC_VERIFIED" &&
				message.type !== "KYC_REJECTED" &&
				message.type !== "KYC_PENDING"
			) {
				return
			}

			void (async () => {
				await queryClient.refetchQueries({ queryKey: ["user-kyc-info"] })
				await queryClient.refetchQueries({ queryKey: ["kyc-status"] })
				await updateSession()
			})()
		})

		return unsubscribe
	}, [listen, queryClient, updateSession])
	const providerStatus = typeof statusResult?.status === "string" ? statusResult.status : undefined

	/** DB/API can be REJECTED before the NextAuth session updates; prefer `rawFromApi` for rejection UI. */
	const isManualDecline =
		rawFromApi === "REJECTED" &&
		Boolean(statusResult) &&
		(providerStatus === "manual_declined" ||
			(Boolean(providerStatus) &&
				providerStatus !== "auto_declined" &&
				providerStatus !== "pending" &&
				providerStatus !== "error" &&
				providerStatus !== "user_cancelled"))

	const isAutoDecline = rawFromApi === "REJECTED" && providerStatus === "auto_declined"

	const knowsRejectionProviderStatus =
		rawFromApi === "REJECTED" &&
		Boolean(statusResult) &&
		typeof providerStatus === "string" &&
		providerStatus.length > 0

	/**
	 * Same idea as pending/needs_review: cached `statusResult` during refetch must not skip loading.
	 * Without this, users see generic "Denied" or wrong decline type until refetch finishes.
	 */
	const isRejectedAwaitingFreshCheck =
		rawFromApi === "REJECTED" && isCheckingStatus && !knowsRejectionProviderStatus

	const displayStatus = (() => {
		if (isRejectedAwaitingFreshCheck) return "PENDING_LOADING"
		if (isNeedsReview && rawFromApi !== "VERIFIED" && rawFromApi !== "REJECTED") {
			return "NEEDS_REVIEW"
		}
		if (isManualDecline) return "MANUAL_DECLINED"
		if (isAutoDecline) return "AUTO_DECLINED"
		return rawFromApi
	})()

	/**
	 * Session is PENDING while we load or refetch — keep "Checking…" + disabled Start until we
	 * either confirm needs_review or confirm the user can still start. Cached query data must not
	 * skip this: after the SDK reports needs_review, invalidate/refetch leaves stale rows in `data`
	 * until the request finishes.
	 */
	const isPendingAwaitingFreshCheck = rawFromApi === "PENDING" && isCheckingStatus && !isNeedsReview

	const isConfirmingProviderStatus = isPendingAwaitingFreshCheck || isRejectedAwaitingFreshCheck

	const meta = kycStatusMeta(
		isPendingAwaitingFreshCheck || isRejectedAwaitingFreshCheck ? "PENDING_LOADING" : displayStatus
	)
	const isVerified = rawFromApi === "VERIFIED"
	const isNeedsReviewUi = displayStatus === "NEEDS_REVIEW"

	const description = isVerified
		? "Your identity is verified. You can now access all features of the platform."
		: isRejectedAwaitingFreshCheck || isPendingAwaitingFreshCheck
			? "Hang on while we confirm your verification state with our provider."
			: isManualDecline
				? "Your verification was declined after manual review. You can try again with clearer documents."
				: isAutoDecline
					? "Our verification provider automatically declined this attempt based on its checks. Please review your documents and try again."
					: isNeedsReviewUi
						? "Your documents are with our verification partner for manual review. You don\u2019t need to start again—we\u2019ll notify you when there\u2019s an update."
						: isExpiryRenewal
							? kycExpiryRenewalDescription(validityDays)
							: "You can finish this whenever you\u2019re ready—some of the app's features is unavailable until you're verified."

	return (
		<Card
			id="profile-kyc-verification"
			className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md"
		>
			<CardContent className="p-6 sm:p-8">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
					<div className="flex min-w-0 gap-4 sm:gap-5">
						<div
							className={cn(
								"flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm sm:size-14",
								meta.iconWrapClassName
							)}
						>
							<meta.StatusIcon
								className={cn("size-6 sm:size-7", isConfirmingProviderStatus && "animate-spin")}
								strokeWidth={1.75}
								aria-hidden
							/>
						</div>
						<div className="min-w-0 space-y-2">
							<div>
								<h2 className="text-lg leading-tight font-semibold tracking-tight">
									Identity verification
								</h2>
								<p className="text-muted-foreground mt-1.5 max-w-xl text-sm leading-relaxed">
									{description}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2 pt-1">
								<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Status
								</span>
								<Badge
									variant={meta.badgeVariant}
									className={cn(
										"gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
										meta.badgeClassName
									)}
								>
									<meta.StatusIcon
										className={cn(
											"size-3.5 shrink-0",
											isConfirmingProviderStatus && "animate-spin"
										)}
										aria-hidden
									/>
									{meta.label}
								</Badge>
							</div>
						</div>
					</div>

					<div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:max-w-md">
						{isVerified ? (
							<p className="text-muted-foreground text-center text-sm sm:text-left lg:text-right xl:text-left">
								Your identity is on file. Update verification if your provider asks you to redo it.
							</p>
						) : isNeedsReviewUi ? (
							<FieldGroup className="bg-muted/40 gap-4 rounded-lg border p-4 sm:gap-5">
								<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
									Verification method
								</p>
								<Button
									type="button"
									variant="outline"
									size="lg"
									disabled
									className="h-auto w-full cursor-not-allowed items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal opacity-80"
								>
									<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border sm:size-10">
										<ShieldAlert className="size-5" aria-hidden />
									</div>
									<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
										<span className="text-sm leading-snug font-medium">Under manual review</span>
										<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
											You don't need to start again. We'll notify you when review is complete.
										</span>
									</div>
								</Button>
							</FieldGroup>
						) : (
							<FieldGroup className="bg-muted/40 gap-4 rounded-lg border p-4 sm:gap-5">
								<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
									Verification method
								</p>
								<Button
									type="button"
									variant="outline"
									size="lg"
									disabled={isLoading || isConfirmingProviderStatus}
									className={cn(
										"h-auto w-full items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal",
										isConfirmingProviderStatus ? "cursor-not-allowed opacity-80" : "cursor-pointer"
									)}
									onClick={() => void start({ skipExpiryGate: true })}
								>
									<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border sm:size-10">
										{isConfirmingProviderStatus || isLoading ? (
											<Loader2 className="size-5 animate-spin" aria-hidden />
										) : (
											<ShieldCheck className="size-5" aria-hidden />
										)}
									</div>
									<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
										<span className="text-sm leading-snug font-medium">
											{isConfirmingProviderStatus
												? "Checking verification status…"
												: isLoading
													? "Opening verification…"
													: "Start identity verification"}
										</span>
										<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
											{isConfirmingProviderStatus
												? "Hang on while we confirm your verification state with our provider."
												: "Complete verification on your screen. This page will update when you're done."}
										</span>
									</div>
								</Button>
							</FieldGroup>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
