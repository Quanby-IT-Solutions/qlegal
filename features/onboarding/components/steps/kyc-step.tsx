"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { getUserKycInfo } from "@/features/kyc/api/kyc.actions"
import { HyperVergeWebSdkLauncher } from "@/features/kyc/components/hyperverge-web-sdk-launcher"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"

import { trpc } from "@/services/trpc/client"

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { KycMobileFlow } from "./kyc-step-mobile"

type KycMode = "choose" | "mobile-pending"

interface KycStepProps {
	onNext: () => void
	onBack: () => void
	kycStatus?: string
	onExpandChange?: (expanded: boolean) => void
}

interface UserKycInfo {
	name: string | null
	email: string | null
	profileFirstName?: string | null
	profileMiddleName?: string | null
	profileLastName?: string | null
	transactionId: string | null
	kycStatus: string | null
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

export function KycStep({ onNext, onBack, kycStatus, onExpandChange }: KycStepProps) {
	const { update: updateSession } = useSession()

	const [userInfo, setUserInfo] = useState<UserKycInfo | null>(null)
	const [mode, setMode] = useState<KycMode>("choose")
	const [hostedEvent, setHostedEvent] = useState<"cancelled" | null>(null)
	const [showWebSdkLauncher, setShowWebSdkLauncher] = useState(false)
	const hasAutoAdvancedRef = useRef(false)

	const [firstName, setFirstName] = useState("")
	const [middleName, setMiddleName] = useState("")
	const [lastName, setLastName] = useState("")

	const updateProfile = trpc.onboarding.updateProfile.useMutation({
		onError: error =>
			toast.error(error instanceof Error ? error.message : "Failed to save your details."),
	})

	const effectiveStatus = userInfo?.kycStatus ?? kycStatus ?? null
	const isVerified = effectiveStatus === "VERIFIED"
	const shouldPoll = mode === "mobile-pending" || effectiveStatus === "PENDING"

	const { data: statusQueryResult, refetch } = useKycStatus({
		currentStatus: effectiveStatus,
		enabled: shouldPoll,
	})
	const statusResult = statusQueryResult?.success ? statusQueryResult.data : null

	const { listen, isSupported } = useKycBroadcast()

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
		void (async () => {
			const result = await getUserKycInfo()
			if (result.success && result.data) {
				setUserInfo({
					...result.data,
					sessionType: result.data.sessionType as "hosted" | "direct" | null,
				})
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
	}, [onExpandChange])

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
				toast.error("KYC verification was declined. Please try again.")
				setHostedEvent(null)
				onExpandChange?.(false)
				setMode("choose")
				void refreshUserInfo()
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
	}, [shouldPoll, listen, isSupported, refetch, updateSession, onExpandChange])

	useEffect(() => {
		if (!statusResult) return
		if (statusResult.kycStatus === "VERIFIED") {
			toast.success("KYC verification approved!")
			setUserInfo(prev => (prev ? { ...prev, kycStatus: "VERIFIED" } : prev))
			void updateSession()
			if (!hasAutoAdvancedRef.current) {
				hasAutoAdvancedRef.current = true
				void refreshUserInfo()
			}
		} else if (statusResult.kycStatus === "REJECTED") {
			toast.error("KYC verification was declined. Please try again.")
			onExpandChange?.(false)
			void refreshUserInfo()
			setMode("choose")
		}
	}, [statusResult, updateSession, onExpandChange])

	const handleStartVerification = () => {
		setHostedEvent(null)
		setShowWebSdkLauncher(true)
		onExpandChange?.(false)
		setMode("mobile-pending")
	}

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
					<CardContent className="px-2!">
						<FieldGroup className="bg-background/70 rounded-md border p-4">
							<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
								Review details
							</p>

							<div className="grid gap-4">
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-foreground/80">First name</p>
									<Input
										value={firstName}
										onChange={event => setFirstName(event.target.value)}
										placeholder="First name"
										disabled={updateProfile.isPending}
										autoComplete="given-name"
									/>
								</div>
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-foreground/80">Middle name</p>
									<Input
										value={middleName}
										onChange={event => setMiddleName(event.target.value)}
										placeholder="Middle name (optional)"
										disabled={updateProfile.isPending}
										autoComplete="additional-name"
									/>
								</div>
								<div className="space-y-1.5">
									<p className="text-xs font-medium text-foreground/80">Last name</p>
									<Input
										value={lastName}
										onChange={event => setLastName(event.target.value)}
										placeholder="Last name"
										disabled={updateProfile.isPending}
										autoComplete="family-name"
									/>
								</div>

								<div className="space-y-1.5">
									<p className="text-xs font-medium text-foreground/80">Address (from your ID)</p>
									<Input
										value={previewAddress ?? ""}
										readOnly
										disabled
										className="bg-muted/50"
										aria-label="Address from KYC"
									/>
								</div>
							</div>
						</FieldGroup>
					</CardContent>

					<CardContent className="px-2!">
						<Alert variant="success">
							<CheckCircle2 className="size-5" />
							<AlertTitle>Identity verified</AlertTitle>
							<AlertDescription>
								Your identity has been successfully verified. Please confirm your name details
								before moving on.
							</AlertDescription>
						</Alert>
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

	const showPendingBanner = mode === "mobile-pending"

	return (
		<>
			<KycMobileFlow
				onBack={onBack}
				onNext={onNext}
				onStartVerification={handleStartVerification}
				isPending={showWebSdkLauncher}
				showPendingBanner={showPendingBanner}
				showCancelledBanner={hostedEvent === "cancelled"}
			/>
			<Dialog open={showWebSdkLauncher} onOpenChange={setShowWebSdkLauncher}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Identity verification</DialogTitle>
					</DialogHeader>
					<HyperVergeWebSdkLauncher
						autoLaunch
						redirectOnSuccess=""
						onComplete={async () => {
							setShowWebSdkLauncher(false)
							await refreshUserInfo()
							void updateSession()
							window.location.reload()
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
