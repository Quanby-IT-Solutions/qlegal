"use client"

import { Loader2, ShieldCheck, XCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"

interface KycMobileFlowProps {
	onBack: () => void
	onNext: () => void
	onStartVerification: () => void
	onTryAgain?: () => void
	isPending: boolean
	showPendingBanner: boolean
	showCancelledBanner?: boolean
	showNeedsReviewBanner?: boolean
	showRejectedBanner?: boolean
	rejectedVariant?: "auto" | "manual"
	isStatusLoading?: boolean
}

export function KycMobileFlow({
	onBack,
	onNext,
	onStartVerification,
	onTryAgain,
	isPending,
	showPendingBanner: _showPendingBanner,
	showCancelledBanner,
	showNeedsReviewBanner,
	showRejectedBanner,
	rejectedVariant,
	isStatusLoading,
}: KycMobileFlowProps) {
	const handleStartClick = showRejectedBanner
		? (onTryAgain ?? onStartVerification)
		: onStartVerification
	const shouldDisableStartButton =
		[isPending, showNeedsReviewBanner, isStatusLoading].some(Boolean) && !showRejectedBanner

	const showCheckingPrimary =
		!showRejectedBanner && (isPending || isStatusLoading)
	const showManualReviewPrimary =
		showNeedsReviewBanner && !showRejectedBanner && !showCheckingPrimary

	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
						Verification method
					</p>

					<div className="grid gap-3">
						<Button
							onClick={handleStartClick}
							disabled={shouldDisableStartButton}
							variant="outline"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							type="button"
						>
							<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border sm:size-10">
								{isPending || isStatusLoading ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<ShieldCheck className="size-5" />
								)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">
									{showManualReviewPrimary
										? "Under manual review"
										: showCheckingPrimary
											? "Checking verification status…"
											: "Start KYC"}
								</span>
								<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
									{showManualReviewPrimary
										? "You don’t need to start again. We’ll notify you when review is complete."
										: showCheckingPrimary
											? "Confirming your result with our provider. This usually takes a moment."
											: "Complete verification on your screen. This page will update automatically."}
								</span>
							</div>
						</Button>
						{showNeedsReviewBanner && (
							<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
								<div className="flex items-start gap-3">
									<ShieldCheck className="mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
									<div className="flex-1">
										<p className="mb-1 text-sm font-medium text-yellow-900 dark:text-yellow-100">
											Verification under manual review
										</p>
										<p className="text-sm text-yellow-800 dark:text-yellow-200">
											Your documents have been submitted and are being reviewed. You don&apos;t need
											to start a new verification. We&apos;ll notify you once the review is
											complete.
										</p>
									</div>
								</div>
							</div>
						)}
						{showRejectedBanner && !isStatusLoading && (
							<Alert variant="destructive" className="rounded-lg">
								<XCircle className="size-4" />
								<AlertTitle>
									{rejectedVariant === "auto"
										? "Verification automatically declined"
										: "Verification declined after review"}
								</AlertTitle>
								<AlertDescription>
									{rejectedVariant === "auto"
										? "Our verification provider declined based on automated checks. Please try again with clearer documents or contact support."
										: "Your verification was declined after manual review. Please try again or contact support."}
								</AlertDescription>
							</Alert>
						)}
					</div>
				</FieldGroup>
			</CardContent>

			{showCancelledBanner ? (
				<CardContent className="px-2!">
					<Alert variant="warning">
						<XCircle className="size-4" />
						<AlertTitle>Verification cancelled</AlertTitle>
						<AlertDescription>
							You closed the verification window. You can try again anytime.
						</AlertDescription>
					</Alert>
				</CardContent>
			) : null}

			<CardFooter className="flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Back
				</Button>
				<Button type="button" onClick={onNext} size="sm" disabled>
					Next
				</Button>
			</CardFooter>
		</>
	)
}
