"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import {
	createUserKycLink,
	getExistingKycLink,
	getUserKycInfo,
	softResetUserKycStatus,
} from "@/features/kyc/api/kyc.actions"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"

import { trpc } from "@/services/trpc/client"

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
	const [isMobilePending, startMobileTransition] = useTransition()
	const hasAutoAdvancedRef = useRef(false)

	const [firstName, setFirstName] = useState("")
	const [middleName, setMiddleName] = useState("")
	const [lastName, setLastName] = useState("")
	const [hasInitializedNameFields, setHasInitializedNameFields] = useState(false)

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
		if (!isVerified || hasInitializedNameFields || !userInfo?.kycPreview) return

		const preview = userInfo.kycPreview
		setFirstName(preview.firstName ?? "")
		setMiddleName(preview.middleName ?? "")
		setLastName(preview.lastName ?? "")
		setHasInitializedNameFields(true)
	}, [isVerified, hasInitializedNameFields, userInfo])

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
				setMode("choose")
				void refreshUserInfo()
				return
			}

			if (message.type === "KYC_CANCELLED") {
				toast.message("Verification cancelled.")
				setHostedEvent("cancelled")
				setMode("choose")
				void refreshUserInfo()
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
			setUserInfo(prev => (prev ? { ...prev, kycStatus: "VERIFIED" } : prev))
			void updateSession()
		} else if (statusResult.kycStatus === "REJECTED") {
			toast.error("KYC verification was declined. Please try again.")
			void refreshUserInfo()
			setMode("choose")
		}
	}, [statusResult, updateSession])

	useEffect(() => {
		if (!isVerified || hasAutoAdvancedRef.current) return
		hasAutoAdvancedRef.current = true

		void updateSession()
		void refreshUserInfo()
	}, [isVerified, onNext, updateSession])

	const handleCreateMobileLink = () => {
		startMobileTransition(async () => {
			setHostedEvent(null)
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
			setHostedEvent(null)
			const result = await getExistingKycLink()
			if (result.success && result.data) {
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("Resuming KYC verification...")
			} else {
				toast.error(result.error ?? "Failed to resume KYC verification")
			}
		})
	}

	const handleContinueOnMobileFromDesktop = () => {
		startMobileTransition(async () => {
			setHostedEvent(null)
			const result = await createUserKycLink()

			if (result.success && result.data) {
				window.open(result.data.url, "_blank", "noopener,noreferrer")
				toast.success("Opening mobile verification…")
				setMode("mobile-pending")
				await refreshUserInfo()
				return
			}

			if (result.error?.includes("already have a pending")) {
				const existing = await getExistingKycLink()
				if (existing.success && existing.data) {
					window.open(existing.data.url, "_blank", "noopener,noreferrer")
					toast.success("Reopening your existing verification link…")
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

	const handleStartOverFromDesktop = async () => {
		setHostedEvent(null)
		const res: Awaited<ReturnType<typeof softResetUserKycStatus>> =
			await softResetUserKycStatus()
		if (res.success) {
			toast.success("Ready to try again")
			setMode("desktop")
			await refreshUserInfo()
			return
		}
		toast.error(res.error)
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

			try {
				await updateProfile.mutateAsync({
					firstName: trimmedFirstName,
					middleName: trimmedMiddleName,
					lastName: trimmedLastName,
				})
				toast.success("Your details have been saved.")
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

	if (mode === "desktop") {
		return (
			<KycDesktopFlow
				onNext={onNext}
				onBack={() => setMode("choose")}
				onExpandChange={onExpandChange}
				onContinueOnMobile={handleContinueOnMobileFromDesktop}
				onStartOver={handleStartOverFromDesktop}
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
			showCancelledBanner={hostedEvent === "cancelled"}
			hasHostedLink={userInfo?.hasHostedLink && effectiveStatus === "PENDING"}
			hasExpiredLink={hasExpiredLink}
		/>
	)
}
