"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import {
	dismissKycExpiryNoticeRequest,
	getUserKycInfoRequest,
	softResetUserKycStatusRequest,
} from "@/features/kyc/api/kyc-client"
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
	const utils = trpc.useUtils()
	const [isResetting, setIsResetting] = useState(false)

	const { launch, isLoading: isSdkLoading } = useHyperVergeSDK({
		redirectOnSuccess: "",
		onComplete: () => {
			void queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
			void queryClient.invalidateQueries({ queryKey: ["user-kyc-info"] })
			void utils.onboarding.getStatus.invalidate()

			void (async () => {
				// Always re-check DB + HyperVerge after SDK closes (expiry renewal leaves user NOT_STARTED
				// until sync/poll succeeds; profile must not stay on stale session JWT).
				await queryClient.refetchQueries({ queryKey: ["user-kyc-info"] })
				await queryClient.refetchQueries({ queryKey: ["kyc-status"] })
				await updateSession()
			})()
		},
	})

	const start = useCallback(
		async (options?: StartKycVerificationOptions) => {
			const result = await getUserKycInfoRequest()
			if (!result.success || !result.data) {
				toast.error(result.error ?? "Could not load verification status.")
				return
			}

			const data = result.data
			const expiryRenewalPending =
				data.kycStatus === "NOT_STARTED" && Boolean(data.kycLastExpiredAt)

			if (expiryRenewalPending) {
				if (options?.skipExpiryGate) {
					const dismissed = await dismissKycExpiryNoticeRequest()
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
					const reset = await softResetUserKycStatusRequest()
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
