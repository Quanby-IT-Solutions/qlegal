"use client"

import { type Route } from "next"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import { getUserKycInfoRequest } from "@/features/kyc/api/kyc-client"
import { useStartKycVerification } from "@/features/kyc/hooks/use-start-kyc-verification"

import {
	kycExpiryRenewalDescription,
	kycExpiryRenewalDialogTitle,
} from "@/core/lib/kyc-reverification-copy"

import { Button } from "@/core/components/ui/button"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"

interface KycRequiredDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: string
	description?: string
	/** When set, primary action navigates here instead of launching the Web SDK. */
	verificationHref?: Route
	/** Unused when using default SDK launch; kept for API compatibility. */
	returnToPath?: string
	primaryLabel?: string
}

const DEFAULT_TITLE = "Identity verification required"
const DEFAULT_DESCRIPTION =
	"Finish identity verification before continuing. Verification opens on this device—no need to visit a separate page."

export function KycRequiredDialog({
	open,
	onOpenChange,
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	verificationHref,
	primaryLabel = "Start identity verification",
}: KycRequiredDialogProps) {
	const { start, isLoading } = useStartKycVerification()

	const { data: kycInfoResult } = useQuery({
		queryKey: ["user-kyc-info"],
		queryFn: () => getUserKycInfoRequest(),
		enabled: open,
		staleTime: 60_000,
	})
	const userInfo = kycInfoResult?.success ? kycInfoResult.data : undefined
	const isExpiryRenewal =
		userInfo?.kycStatus === "NOT_STARTED" && Boolean(userInfo?.kycLastExpiredAt)
	const validityDays = userInfo?.kycVerificationValidityDays ?? 14

	const resolvedTitle = isExpiryRenewal ? kycExpiryRenewalDialogTitle() : title
	const resolvedDescription = isExpiryRenewal
		? kycExpiryRenewalDescription(validityDays)
		: description

	const handlePrimary = () => {
		if (verificationHref) return
		onOpenChange(false)
		// Same as Profile: after 14-day expiry, dismiss the server flag and open the SDK here—do not send users to Profile.
		void start({ skipExpiryGate: true })
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
					<AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Close</AlertDialogCancel>
					{verificationHref ? (
						<Button asChild>
							<Link href={verificationHref}>{primaryLabel}</Link>
						</Button>
					) : (
						<Button type="button" disabled={isLoading} onClick={handlePrimary}>
							{isLoading ? "Opening…" : primaryLabel}
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
