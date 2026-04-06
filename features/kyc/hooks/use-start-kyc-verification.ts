"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import {
	dismissKycExpiryNotice,
	getUserKycInfo,
	softResetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"
import { useHyperVergeSDK } from "@/features/kyc/hooks/use-hyperverge-sdk"

export interface StartKycVerificationOptions {
	/**
	 * When true (Profile, booking restriction dialogs, etc.), if the user must renew after expiry,
	 * dismiss the notice server-side and launch verification. When false, show a toast and abort
	 * (legacy path for flows that still expect the user to open Profile first).
	 */
	skipExpiryGate?: boolean
}

/**
 * Launches HyperVerge Web KYC from profile or restriction dialogs without navigating to `/onboarding`.
 */
export function useStartKycVerification() {
	const { update: updateSession } = useSession()
	const queryClient = useQueryClient()
	const router = useRouter()
	const utils = trpc.useUtils()
	const [isResetting, setIsResetting] = useState(false)

	const { launch, isLoading: isSdkLoading } = useHyperVergeSDK({
		redirectOnSuccess: "",
		onComplete: (rawStatus: string) => {
			const normalized = (rawStatus ?? "").trim().toLowerCase().replace(/\s+/g, "_")
			void queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
			void queryClient.invalidateQueries({ queryKey: ["user-kyc-info"] })
			void utils.onboarding.getStatus.invalidate()

			void (async () => {
				const shouldRefetchKycStatusBeforeRefresh =
					normalized === "needs_review" ||
					normalized === "manual_review" ||
					normalized === "auto_declined" ||
					normalized === "manual_declined"
				if (shouldRefetchKycStatusBeforeRefresh) {
					// Fresh check so the profile card sees needs_review / manual vs auto decline before session refresh.
					await queryClient.refetchQueries({ queryKey: ["kyc-status"] })
				}
				if (normalized === "auto_approved") {
					await updateSession()
					router.refresh()
					return
				}
				if (normalized === "needs_review" || normalized === "manual_review") {
					await updateSession()
					router.refresh()
					return
				}
				await updateSession()
				router.refresh()
			})()
		},
	})

	const start = useCallback(
		async (options?: StartKycVerificationOptions) => {
			const result = await getUserKycInfo()
			if (!result.success || !result.data) {
				toast.error(result.error ?? "Could not load verification status.")
				return
			}

			const data = result.data
			const expiryRenewalPending =
				data.kycStatus === "NOT_STARTED" && Boolean(data.kycLastExpiredAt)

			if (expiryRenewalPending) {
				if (options?.skipExpiryGate) {
					const dismissed = await dismissKycExpiryNotice()
					if (!dismissed.success) {
						toast.error(dismissed.error ?? "Could not continue. Please try again.")
						return
					}
					void queryClient.invalidateQueries({ queryKey: ["user-kyc-info"] })
					await updateSession()
				} else {
					toast.error(
						"Your previous verification period has ended. Open Profile → Identity verification to continue."
					)
					return
				}
			}

			const needsReset = data.kycStatus === "REJECTED"
			if (needsReset) {
				setIsResetting(true)
				try {
					const reset = await softResetUserKycStatus()
					if (!reset.success) {
						toast.error(reset.error ?? "Could not reset. Please try again or contact support.")
						return
					}
					queryClient.removeQueries({ queryKey: ["kyc-status"] })
					void queryClient.invalidateQueries({ queryKey: ["user-kyc-info"] })
					await updateSession()
				} finally {
					setIsResetting(false)
				}
			}

			void launch()
		},
		[launch, queryClient, updateSession]
	)

	return {
		start,
		isLoading: isSdkLoading || isResetting,
	}
}
