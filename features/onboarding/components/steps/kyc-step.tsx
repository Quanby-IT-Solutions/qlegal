"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { trpc } from "@/services/trpc/client"

import {
	dismissKycExpiryNotice,
	getUserKycInfo,
	softResetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"
import { useHyperVergeSDK } from "@/features/kyc/hooks/use-hyperverge-sdk"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"

import { KycMobileFlow } from "./kyc-step-mobile"

type KycMode = "choose" | "mobile-pending"

interface KycStepProps {
	onNext: () => void
	onBack: () => void
	kycStatus?: string
	onExpandChange?: (expanded: boolean) => void
	/** When true (from `?autoStart=1`), launch the verification SDK without an extra tap. */
	autoStartVerification?: boolean
}

interface UserKycInfo {
	name: string | null
	email: string | null
	profileFirstName?: string | null
	profileMiddleName?: string | null
	profileLastName?: string | null
	transactionId: string | null
	kycStatus: string | null
	kycLastExpiredAt?: string | null
	kycVerificationValidityDays?: number
	kycLinkCreatedAt?: Date | null
	hasHostedLink?: boolean
	sessionType?: "hosted" | "direct" | null
	kycPreview?: {
		firstName: string | null
		middleName: string | null
		lastName: string | null
		address: string | null
		homeStreet: string | null
		barangay: string | null
		cityProvince: string | null
		documentType: string | null
		documentCountry: string | null
		ocrTransactionId: string | null
	} | null
}

export function KycStep({
	onNext,
	onBack,
	kycStatus,
	onExpandChange,
	autoStartVerification = false,
}: KycStepProps) {
	const { update: updateSession } = useSession()
	const queryClient = useQueryClient()

	const [userInfo, setUserInfo] = useState<UserKycInfo | null>(null)
	const [mode, setMode] = useState<KycMode>("choose")
	const [hostedEvent, setHostedEvent] = useState<"cancelled" | null>(null)
	/** True right after Web SDK reports needs_review so we show the yellow banner before Output API refetch finishes. */
	const [sdkNeedsReviewPending, setSdkNeedsReviewPending] = useState(false)
	const hasAutoAdvancedRef = useRef(false)
	/** Prevents repeated rejection toasts when refreshUserInfo() updates state and re-runs effects. */
	const rejectionNotifiedRef = useRef(false)
	/** After we have a terminal REJECTED from checkUserKycStatus, stop re-enabling the status query. */
	const [kycRejectDetailsLoaded, setKycRejectDetailsLoaded] = useState(false)

	const [firstName, setFirstName] = useState("")
	const [middleName, setMiddleName] = useState("")
	const [lastName, setLastName] = useState("")
	const [isResettingForRetry, setIsResettingForRetry] = useState(false)
	const [isDismissingExpiryNotice, setIsDismissingExpiryNotice] = useState(false)

	const refreshUserInfo = useCallback(async () => {
		const result = await getUserKycInfo()
		if (result.success && result.data) {
			setUserInfo({
				...result.data,
				sessionType: result.data.sessionType as "hosted" | "direct" | null,
			})
			if (result.data.kycStatus === "NOT_STARTED") {
				queryClient.removeQueries({ queryKey: ["kyc-status"] })
			}
		}
	}, [queryClient])

	const handleDismissKycExpiryNotice = useCallback(async () => {
		setIsDismissingExpiryNotice(true)
		try {
			const result = await dismissKycExpiryNotice()
			if (!result.success) {
				toast.error(result.error ?? "Could not continue. Please try again.")
				return
			}
			await refreshUserInfo()
			await updateSession()
		} finally {
			setIsDismissingExpiryNotice(false)
		}
	}, [refreshUserInfo, updateSession])

	const { launch: launchSdk, isLoading: isLaunchingSdk } = useHyperVergeSDK({
		redirectOnSuccess: "", // Do not redirect via href, we will handle it with state update / location reload
		onComplete: status => {
			const normalized = (status ?? "").trim().toLowerCase().replace(/\s+/g, "_")
			if (normalized === "needs_review" || normalized === "manual_review") {
				setSdkNeedsReviewPending(true)
				setMode("mobile-pending")
				onExpandChange?.(false)
			}
			void queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
			void refreshUserInfo().then(() => {
				if (normalized === "auto_approved") {
					void updateSession()
					window.location.reload()
				}
			})
		},
	})

	const updateProfile = trpc.onboarding.updateProfile.useMutation({
		onError: error =>
			toast.error(error instanceof Error ? error.message : "Failed to save your details."),
	})

	const effectiveStatus = userInfo?.kycStatus ?? kycStatus ?? null
	const isVerified = effectiveStatus === "VERIFIED"
	const shouldPoll = mode === "mobile-pending" || effectiveStatus === "PENDING"
	const shouldFetchStatus =
		shouldPoll || (effectiveStatus === "REJECTED" && !kycRejectDetailsLoaded)

	const {
		data: statusQueryResult,
		refetch,
		isCheckingStatus,
	} = useKycStatus({
		currentStatus: effectiveStatus,
		enabled: shouldFetchStatus,
	})
	const statusResult =
		statusQueryResult?.success === true && statusQueryResult.data !== undefined
			? statusQueryResult.data
			: null
	/** TanStack cache can still hold REJECTED/VERIFIED from before 14-day expiry or reset while `user` is NOT_STARTED. */
	const statusQueryStaleVsFreshStart =
		effectiveStatus === "NOT_STARTED" &&
		statusResult !== null &&
		statusResult.kycStatus !== "NOT_STARTED"
	const resolvedStatusResult = statusQueryStaleVsFreshStart ? null : statusResult

	const isNeedsReview =
		resolvedStatusResult?.needsReview ?? resolvedStatusResult?.status === "needs_review"
	const isStatusLoading = Boolean(shouldFetchStatus && isCheckingStatus)

	useEffect(() => {
		if (isStatusLoading) return
		if (!resolvedStatusResult) return
		if (isNeedsReview) {
			setSdkNeedsReviewPending(false)
			return
		}
		if (
			resolvedStatusResult.kycStatus === "VERIFIED" ||
			resolvedStatusResult.kycStatus === "REJECTED"
		) {
			setSdkNeedsReviewPending(false)
		}
	}, [isStatusLoading, resolvedStatusResult, isNeedsReview])
	const isRejected =
		resolvedStatusResult?.kycStatus === "REJECTED" ||
		(effectiveStatus === "REJECTED" && kycRejectDetailsLoaded)
	const rejectedVariant: "auto" | "manual" =
		resolvedStatusResult?.status === "auto_declined" ? "auto" : "manual"

	const kycValidityDays = userInfo?.kycVerificationValidityDays ?? 14
	const showKycExpiryNotice =
		effectiveStatus === "NOT_STARTED" && Boolean(userInfo?.kycLastExpiredAt)

	const { listen, isSupported } = useKycBroadcast()

	useEffect(() => {
		if (!shouldFetchStatus) return
		void queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
	}, [queryClient, shouldFetchStatus])

	useEffect(() => {
		void (async () => {
			const result = await getUserKycInfo()
			if (result.success && result.data) {
				setUserInfo({
					...result.data,
					sessionType: result.data.sessionType as "hosted" | "direct" | null,
				})
				if (result.data.kycStatus === "NOT_STARTED") {
					queryClient.removeQueries({ queryKey: ["kyc-status"] })
				}
				if (result.data.kycStatus === "PENDING") {
					onExpandChange?.(false)
					setMode("mobile-pending")
				}
				if (result.data.kycStatus === "VERIFIED" && result.data.kycPreview) {
					setFirstName(result.data.kycPreview.firstName ?? "")
					setMiddleName(result.data.kycPreview.middleName ?? "")
					setLastName(result.data.kycPreview.lastName ?? "")
				}
			}
		})()
	}, [onExpandChange, queryClient])

	useEffect(() => {
		if (effectiveStatus !== "REJECTED") {
			rejectionNotifiedRef.current = false
			setKycRejectDetailsLoaded(false)
		}
	}, [effectiveStatus])

	useEffect(() => {
		if (!shouldPoll) return
		const unsubscribe = listen(message => {
			if (message.type === "KYC_VERIFIED") {
				toast.success("KYC verified!")
				void updateSession()
				window.location.reload()
				return
			}

			if (message.type === "KYC_REJECTED") {
				setHostedEvent(null)
				onExpandChange?.(false)
				setMode("choose")
				void refreshUserInfo()
				if (!rejectionNotifiedRef.current) {
					rejectionNotifiedRef.current = true
					toast.error("KYC verification was declined. Please try again.")
				}
				return
			}

			if (message.type === "KYC_CANCELLED") {
				toast.message("Verification cancelled.")
				setHostedEvent("cancelled")
				onExpandChange?.(false)
				setMode("choose")
				void refreshUserInfo()
			}
		})

		let removeFocusListener: (() => void) | undefined
		if (!isSupported()) {
			const handleFocus = () => void refetch()
			window.addEventListener("focus", handleFocus)
			removeFocusListener = () => window.removeEventListener("focus", handleFocus)
		}

		return () => {
			unsubscribe?.()
			removeFocusListener?.()
		}
	}, [shouldPoll, listen, isSupported, refetch, updateSession, onExpandChange, refreshUserInfo])

	useEffect(() => {
		if (resolvedStatusResult?.kycStatus !== "VERIFIED") return

		const sessionSaysVerified = kycStatus === "VERIFIED"
		const localSaysVerified = userInfo?.kycStatus === "VERIFIED"
		const needsHardRefresh =
			!sessionSaysVerified || userInfo?.kycStatus === "PENDING" || mode === "mobile-pending"

		if (!needsHardRefresh && sessionSaysVerified && localSaysVerified) {
			return
		}

		if (hasAutoAdvancedRef.current) return
		hasAutoAdvancedRef.current = true

		toast.success("KYC verification approved!")
		setUserInfo(prev => (prev ? { ...prev, kycStatus: "VERIFIED" } : prev))
		onExpandChange?.(false)
		setMode("choose")

		if (needsHardRefresh) {
			void updateSession().finally(() => {
				window.location.reload()
			})
			return
		}

		void updateSession()
		void refreshUserInfo()
	}, [
		resolvedStatusResult,
		updateSession,
		onExpandChange,
		kycStatus,
		userInfo,
		mode,
		refreshUserInfo,
	])

	useEffect(() => {
		if (resolvedStatusResult?.kycStatus !== "REJECTED") return

		setKycRejectDetailsLoaded(true)

		if (rejectionNotifiedRef.current) return
		rejectionNotifiedRef.current = true

		const autoDeclined = resolvedStatusResult?.status === "auto_declined"
		toast.error(
			autoDeclined
				? "Your KYC verification was automatically declined by our verification provider. Please try again with clearer documents."
				: "KYC verification was declined. Please try again."
		)
		onExpandChange?.(false)
		void refreshUserInfo()
		setMode("choose")
	}, [resolvedStatusResult, onExpandChange, refreshUserInfo])

	const handleStartVerification = async () => {
		if (showKycExpiryNotice) return

		setHostedEvent(null)
		setSdkNeedsReviewPending(false)
		onExpandChange?.(false)

		const needsResetBeforeLaunch =
			effectiveStatus === "REJECTED" ||
			userInfo?.kycStatus === "REJECTED" ||
			resolvedStatusResult?.kycStatus === "REJECTED"

		if (needsResetBeforeLaunch) {
			setIsResettingForRetry(true)
			try {
				const result = await softResetUserKycStatus()
				if (!result.success) {
					toast.error(result.error ?? "Could not reset. Please try again or contact support.")
					return
				}
				queryClient.removeQueries({ queryKey: ["kyc-status"] })
				setKycRejectDetailsLoaded(false)
				rejectionNotifiedRef.current = false
				await refreshUserInfo()
				await updateSession()
			} finally {
				setIsResettingForRetry(false)
			}
		}

		setMode("mobile-pending")
		void launchSdk()
	}

	const handleStartVerificationRef = useRef(handleStartVerification)
	handleStartVerificationRef.current = handleStartVerification

	const kycAutoStartConsumedRef = useRef(false)

	useEffect(() => {
		if (!autoStartVerification) return
		if (kycAutoStartConsumedRef.current) return
		if (isVerified) return
		if (showKycExpiryNotice) return

		const showNeedsReviewBannerEarly = sdkNeedsReviewPending || isNeedsReview
		const isPendingForButton =
			isResettingForRetry ||
			isLaunchingSdk ||
			isStatusLoading ||
			(sdkNeedsReviewPending && isNeedsReview === false)
		if (isPendingForButton || showNeedsReviewBannerEarly) return
		if (effectiveStatus === "PENDING" && !isRejected) return

		kycAutoStartConsumedRef.current = true
		void handleStartVerificationRef.current()
	}, [
		autoStartVerification,
		isVerified,
		showKycExpiryNotice,
		sdkNeedsReviewPending,
		isNeedsReview,
		isResettingForRetry,
		isLaunchingSdk,
		isStatusLoading,
		effectiveStatus,
		isRejected,
	])

	if (isVerified) {
		const previewAddress = userInfo?.kycPreview?.address ?? null

		const handleSaveAndNext = async () => {
			const trimmedFirstName = firstName.trim()
			const trimmedMiddleName = middleName.trim()
			const trimmedLastName = lastName.trim()

			if (!trimmedFirstName || !trimmedLastName) {
				toast.error("Please confirm your first and last name before continuing.")
				return
			}

			const persistedFirstName = userInfo?.profileFirstName?.trim() ?? ""
			const persistedMiddleName = userInfo?.profileMiddleName?.trim() ?? ""
			const persistedLastName = userInfo?.profileLastName?.trim() ?? ""

			const unchanged =
				trimmedFirstName === persistedFirstName &&
				trimmedMiddleName === persistedMiddleName &&
				trimmedLastName === persistedLastName

			if (unchanged) {
				onNext()
				return
			}

			try {
				const result = await updateProfile.mutateAsync({
					firstName: trimmedFirstName,
					middleName: trimmedMiddleName,
					lastName: trimmedLastName,
				})
				setUserInfo(prev =>
					prev
						? {
								...prev,
								profileFirstName: trimmedFirstName,
								profileMiddleName: trimmedMiddleName,
								profileLastName: trimmedLastName,
							}
						: prev
				)
				toast.success(result.message)
				onNext()
			} catch {
				// Error already handled in mutation onError
			}
		}

		return (
			<>
				<div className="space-y-2">
					<CardContent className="!px-2">
						<Alert variant="success">
							<CheckCircle2 className="size-5" />
							<AlertTitle>Identity verified</AlertTitle>
							<AlertDescription>
								Your identity has been successfully verified. Please confirm your details.
							</AlertDescription>
						</Alert>
					</CardContent>

					<CardContent className="!px-2">
						<FieldGroup className="bg-background/70 rounded-md border p-4">
							<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
								Review details
							</p>

							<div className="grid gap-4">
								<div className="space-y-1.5">
									<p className="text-foreground/80 text-xs font-medium">First name</p>
									<Input
										value={firstName}
										onChange={event => setFirstName(event.target.value)}
										placeholder="First name"
										disabled={updateProfile.isPending}
										autoComplete="given-name"
									/>
								</div>
								<div className="space-y-1.5">
									<p className="text-foreground/80 text-xs font-medium">Middle name</p>
									<Input
										value={middleName}
										onChange={event => setMiddleName(event.target.value)}
										placeholder="Middle name (optional)"
										disabled={updateProfile.isPending}
										autoComplete="additional-name"
									/>
								</div>
								<div className="space-y-1.5">
									<p className="text-foreground/80 text-xs font-medium">Last name</p>
									<Input
										value={lastName}
										onChange={event => setLastName(event.target.value)}
										placeholder="Last name"
										disabled={updateProfile.isPending}
										autoComplete="family-name"
									/>
								</div>

								<div className="space-y-1.5">
									<p className="text-foreground/80 text-xs font-medium">Address (from your ID)</p>
									<Input
										value={previewAddress ?? ""}
										readOnly
										disabled
										className="bg-muted/50"
										aria-label="Address from identity verification"
									/>
								</div>
							</div>
						</FieldGroup>
					</CardContent>
				</div>

				<CardFooter className="justify-between">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={handleSaveAndNext}
						disabled={updateProfile.isPending}
					>
						{updateProfile.isPending ? "Saving…" : "Continue"}
					</Button>
				</CardFooter>
			</>
		)
	}

	const showPendingBanner =
		mode === "mobile-pending" && !isNeedsReview && !sdkNeedsReviewPending && !isStatusLoading
	const showNeedsReviewBanner = sdkNeedsReviewPending || isNeedsReview
	const showRejectedBanner = isRejected && !isStatusLoading

	return (
		<>
			<AlertDialog open={showKycExpiryNotice}>
				<AlertDialogContent onEscapeKeyDown={e => e.preventDefault()}>
					<AlertDialogHeader>
						<AlertDialogTitle>Verify your identity again</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground space-y-3 text-sm">
							<span className="mb-3 block">
								For security and to align with our verification provider&apos;s data retention,
								identity checks are only considered valid for about {kycValidityDays} days. Your
								previous verification period has ended, so we need a fresh verification.
							</span>
							<span className="block">
								The provider may no longer return full details for your old check. When you
								continue, we start a new verification with a new transaction.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction
							disabled={isDismissingExpiryNotice}
							onClick={event => {
								event.preventDefault()
								void handleDismissKycExpiryNotice()
							}}
						>
							{isDismissingExpiryNotice ? "Please wait…" : "I understand, continue"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<KycMobileFlow
				onBack={onBack}
				onNext={onNext}
				onStartVerification={() => void handleStartVerification()}
				isPending={Boolean(
					isResettingForRetry ||
					isLaunchingSdk ||
					isStatusLoading ||
					(sdkNeedsReviewPending && isNeedsReview === false)
				)}
				showPendingBanner={showPendingBanner}
				showCancelledBanner={hostedEvent === "cancelled"}
				showNeedsReviewBanner={showNeedsReviewBanner}
				showRejectedBanner={showRejectedBanner}
				rejectedVariant={isRejected ? rejectedVariant : undefined}
			/>
		</>
	)
}
