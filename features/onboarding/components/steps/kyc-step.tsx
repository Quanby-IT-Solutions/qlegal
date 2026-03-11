"use client"

import { useEffect, useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import {
	createUserKycLink,
	getExistingKycLink,
	getUserKycInfo,
} from "@/features/kyc/api/kyc.actions"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"

import { KycDesktopFlow } from "./kyc-step-desktop"
import { KycMobileFlow } from "./kyc-step-mobile"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

type KycMode = "choose" | "mobile-pending" | "desktop"

interface KycStepProps {
	onNext: () => void
	onBack: () => void
	kycStatus?: string
	onExpandChange?: (expanded: boolean) => void
}

interface UserKycInfo {
	name: string | null
	email: string | null
	transactionId: string | null
	kycStatus: string | null
	kycLinkCreatedAt?: Date | null
	hasHostedLink?: boolean
	sessionType?: "hosted" | "direct" | null
}

export function KycStep({ onNext, onBack, kycStatus, onExpandChange }: KycStepProps) {
	const { update: updateSession } = useSession()
	const isVerified = kycStatus === "VERIFIED"

	const [userInfo, setUserInfo] = useState<UserKycInfo | null>(null)
	const [mode, setMode] = useState<KycMode>("choose")
	const [isMobilePending, startMobileTransition] = useTransition()

	const effectiveStatus = userInfo?.kycStatus ?? kycStatus ?? null
	const shouldPoll = mode === "mobile-pending" || effectiveStatus === "PENDING"

	const { data: statusQueryResult, refetch } = useKycStatus({
		currentStatus: effectiveStatus,
		enabled: shouldPoll,
	})
	const statusResult = statusQueryResult?.success ? statusQueryResult.data : null

	const { listen, isSupported } = useKycBroadcast()

	const hasExpiredLink =
		userInfo?.kycStatus === "PENDING" &&
		userInfo?.kycLinkCreatedAt !== null &&
		userInfo.kycLinkCreatedAt !== undefined &&
		Date.now() - new Date(userInfo.kycLinkCreatedAt).getTime() > ONE_DAY_MS

	const refreshUserInfo = async () => {
		const result = await getUserKycInfo()
		if (result.success && result.data) {
			setUserInfo({
				...result.data,
				sessionType: result.data.sessionType as "hosted" | "direct" | null,
			})
		}
	}

	useEffect(() => {
		if (mode !== "desktop") onExpandChange?.(false)
	}, [mode, onExpandChange])

	useEffect(() => {
		void (async () => {
			const result = await getUserKycInfo()
			if (result.success && result.data) {
				setUserInfo({
					...result.data,
					sessionType: result.data.sessionType as "hosted" | "direct" | null,
				})
				if (result.data.kycStatus === "PENDING" && result.data.hasHostedLink) {
					setMode("mobile-pending")
				}
			}
		})()
	}, [])

	useEffect(() => {
		if (!shouldPoll) return
		const unsubscribe = listen(message => {
			if (message.type === "KYC_VERIFIED") {
				toast.success("KYC verified!")
				void updateSession()
				window.location.reload()
			}
		})
		return unsubscribe
	}, [shouldPoll, listen, updateSession])

	useEffect(() => {
		if (!shouldPoll || isSupported()) return
		const handleFocus = () => void refetch()
		window.addEventListener("focus", handleFocus)
		return () => window.removeEventListener("focus", handleFocus)
	}, [shouldPoll, isSupported, refetch])

	useEffect(() => {
		if (!statusResult) return
		if (statusResult.kycStatus === "VERIFIED") {
			toast.success("KYC verification approved!")
			void updateSession()
			setTimeout(() => window.location.reload(), 1500)
		} else if (statusResult.kycStatus === "REJECTED") {
			toast.error("KYC verification was declined. Please try again.")
			void refreshUserInfo()
			setMode("choose")
		}
	}, [statusResult, updateSession])

	const handleCreateMobileLink = () => {
		startMobileTransition(async () => {
			const result = await createUserKycLink()

			if (result.success && result.data) {
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("KYC verification link created! Opening in new window...")
				setMode("mobile-pending")
				await refreshUserInfo()
				return
			}

			if (result.error?.includes("already have a pending")) {
				const existing = await getExistingKycLink()
				if (existing.success && existing.data) {
					window.open(existing.data.url, "_blank", "noopener,noreferrer")
					toast.success("Reopening your existing verification link...")
					setMode("mobile-pending")
					await refreshUserInfo()
				} else {
					toast.error(existing.error ?? "Failed to resume existing verification")
				}
				return
			}

			toast.error(result.error ?? "Failed to create KYC link")
		})
	}

	const handleResumeMobileLink = () => {
		startMobileTransition(async () => {
			const result = await getExistingKycLink()
			if (result.success && result.data) {
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("Resuming KYC verification...")
			} else {
				toast.error(result.error ?? "Failed to resume KYC verification")
			}
		})
	}

	if (isVerified) {
		return (
			<>
				<CardContent className="px-2!">
					<div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/20">
						<CheckCircle2 className="mx-auto mb-2 size-8 text-green-600 dark:text-green-400" />
						<p className="font-medium text-green-900 dark:text-green-100">
							Your identity is verified
						</p>
						<p className="text-sm text-green-700 dark:text-green-300">
							You can continue to the next step.
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex items-center justify-end gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button type="button" onClick={onNext} size="sm">
						Next
					</Button>
				</CardFooter>
			</>
		)
	}

	if (mode === "desktop") {
		return (
			<KycDesktopFlow
				onNext={onNext}
				onBack={() => setMode("choose")}
				onExpandChange={onExpandChange}
			/>
		)
	}

	const showPendingBanner = mode === "mobile-pending"

	return (
		<KycMobileFlow
			onBack={onBack}
			onNext={onNext}
			onCreateMobileLink={handleCreateMobileLink}
			onResumeMobileLink={handleResumeMobileLink}
			onSelectDesktop={() => setMode("desktop")}
			isMobilePending={isMobilePending}
			showPendingBanner={showPendingBanner}
			hasHostedLink={userInfo?.hasHostedLink && effectiveStatus === "PENDING"}
			hasExpiredLink={hasExpiredLink}
		/>
	)
}
