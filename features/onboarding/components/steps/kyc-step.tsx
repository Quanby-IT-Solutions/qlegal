"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
	ArrowLeft,
	CheckCircle2,
	Loader2,
	Maximize2,
	Minimize2,
	Monitor,
	Smartphone,
	XCircle,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Label } from "@/core/components/ui/label"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import {
	createUserKycLink,
	getExistingKycLink,
	getUserKycInfo,
	resetUserKycStatus,
	runDirectKycVerification,
} from "@/features/kyc/api/kyc.actions"
import { CameraCapture } from "@/features/kyc/components/camera-capture"
import { CountryCombobox } from "@/features/kyc/components/country-combobox"
import { DocumentTypeCombobox } from "@/features/kyc/components/document-type-combobox"
import { useKycStatus } from "@/features/kyc/hooks/use-kyc-status"
import { getCountries, getDocumentTypes } from "@/features/kyc/lib/supported-documents"

const COUNTRIES = getCountries()

const DESKTOP_STEP_CONFIG = {
	id: { number: 1, total: 3, title: "Capture ID Document" },
	selfie: { number: 2, total: 3, title: "Capture Selfie" },
	review: { number: 3, total: 3, title: "Review & Submit" },
	result: { number: 3, total: 3, title: "Verification Result" },
} as const

const DESKTOP_STEPS = ["id", "selfie", "review"] as const

const ONE_DAY_MS = 24 * 60 * 60 * 1000

type KycMode = "choose" | "mobile-pending" | "desktop"
type DesktopStep = "id" | "selfie" | "review" | "result"

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

// ============================================================================
// Main Component
// ============================================================================

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

	// -- Helpers ---------------------------------------------------------------

	const refreshUserInfo = async () => {
		const result = await getUserKycInfo()
		if (result.success && result.data) {
			setUserInfo({
				...result.data,
				sessionType: result.data.sessionType as "hosted" | "direct" | null,
			})
		}
	}

	// -- Effects ---------------------------------------------------------------

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

	// -- Mobile link handlers --------------------------------------------------

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

	// -- Render ----------------------------------------------------------------

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
		<KycMethodChooser
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

// ============================================================================
// Method Chooser (Mobile / Desktop selection)
// ============================================================================

interface KycMethodChooserProps {
	onBack: () => void
	onNext: () => void
	onCreateMobileLink: () => void
	onResumeMobileLink: () => void
	onSelectDesktop: () => void
	isMobilePending: boolean
	showPendingBanner: boolean
	hasHostedLink?: boolean
	hasExpiredLink: boolean
}

function KycMethodChooser({
	onBack,
	onNext,
	onCreateMobileLink,
	onResumeMobileLink,
	onSelectDesktop,
	isMobilePending,
	showPendingBanner,
	hasHostedLink,
	hasExpiredLink,
}: KycMethodChooserProps) {
	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
						Verification method
					</p>

					<div className="grid gap-3">
						<Button
							onClick={hasHostedLink ? onResumeMobileLink : onCreateMobileLink}
							disabled={isMobilePending}
							variant="outline"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							type="button"
						>
							<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10">
								{isMobilePending ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<Smartphone className="size-5" />
								)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">
									{hasHostedLink ? "Resume mobile verification" : "Mobile Link Verification"}
								</span>
								<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
									{hasHostedLink
										? "Reopen your verification link on your phone and continue where you left off."
										: "Open a secure link on your phone to complete verification."}
								</span>
							</div>
						</Button>

						<Button
							onClick={onSelectDesktop}
							disabled={isMobilePending}
							variant="outline"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							type="button"
						>
							<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10">
								<Monitor className="size-5" />
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">
									{showPendingBanner ? "Switch to desktop camera" : "Desktop Camera Verification"}
								</span>
								<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
									Use your desktop webcam to capture your ID and selfie
									{showPendingBanner ? " directly in this browser." : "."}
								</span>
							</div>
						</Button>

						{showPendingBanner && (
							<>
								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
									<div className="flex items-start gap-3">
										<Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
										<div className="flex-1">
											<p className="mb-1 text-sm font-medium text-blue-900 dark:text-blue-100">
												Verification in progress
											</p>
											<p className="text-sm text-blue-700 dark:text-blue-300">
												Complete verification on your mobile device. This page will update
												automatically.
											</p>
										</div>
									</div>
								</div>
								<div className="flex justify-center border-t pt-3">
									<button
										onClick={onCreateMobileLink}
										disabled={isMobilePending}
										className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50"
										type="button"
									>
										{hasExpiredLink
											? "Link expired? Create new verification link"
											: "Link not working? Create new verification link"}
									</button>
								</div>
							</>
						)}
					</div>
				</FieldGroup>
			</CardContent>
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

// ============================================================================
// Desktop Camera Flow (self-contained state)
// ============================================================================

interface KycDesktopFlowProps {
	onNext: () => void
	onBack: () => void
	onExpandChange?: (expanded: boolean) => void
}

function KycDesktopFlow({ onNext, onBack, onExpandChange }: KycDesktopFlowProps) {
	const { update: updateSession } = useSession()

	const [step, setStep] = useState<DesktopStep>("id")
	const [countryId, setCountryId] = useState("")
	const [documentId, setDocumentId] = useState("")
	const [idImage, setIdImage] = useState<string | null>(null)
	const [selfieImage, setSelfieImage] = useState<string | null>(null)
	const [result, setResult] = useState<{
		ok: boolean
		message: string
		status?: string
		transactionId?: string
	} | null>(null)
	const [isSubmitting, startSubmitTransition] = useTransition()
	const [isFullscreen, setIsFullscreen] = useState(false)

	const documentTypes = useMemo(() => getDocumentTypes(countryId), [countryId])

	const handleCountryChange = (newCountryId: string) => {
		setCountryId(newCountryId)
		const newDocs = getDocumentTypes(newCountryId)
		if (!newDocs.some(d => d.value === documentId)) {
			setDocumentId(newDocs[0]?.value ?? "")
		}
	}

	const canContinue =
		step === "id"
			? !!idImage && !!countryId && !!documentId
			: step === "selfie"
				? !!selfieImage
				: true

	const currentStepInfo = DESKTOP_STEP_CONFIG[step]

	useEffect(() => {
		onExpandChange?.(isFullscreen)
	}, [isFullscreen, onExpandChange])

	const reset = () => {
		setStep("id")
		setIdImage(null)
		setSelfieImage(null)
		setResult(null)
		setIsFullscreen(false)
	}

	const handleBack = () => {
		if (step === "id") {
			reset()
			onBack()
		} else {
			setStep(step === "selfie" ? "id" : "selfie")
		}
	}

	const handleSubmit = () => {
		if (!idImage || !selfieImage) return

		startSubmitTransition(() => {
			void (async () => {
				setResult(null)
				try {
					const res = await runDirectKycVerification({
						countryId: countryId.trim(),
						documentId: documentId.trim(),
						idImageBase64: idImage,
						selfieImageBase64: selfieImage,
					})
					if (!res.success || !res.data) {
						throw new Error(res.error ?? "Direct KYC failed")
					}
					const status = res.data.kycStatus
					setResult({
						ok: status === "VERIFIED",
						message: res.data.message,
						status,
						transactionId: res.data.transactionId,
					})
					setStep("result")
					if (status === "VERIFIED") {
						toast.success("KYC verified!")
						await updateSession()
						setTimeout(() => window.location.reload(), 1200)
					} else if (status === "PENDING") {
						toast.message("KYC needs review. Please wait for approval.")
					} else {
						toast.error("KYC failed. Please retake clearer photos and try again.")
					}
				} catch (e) {
					const message = e instanceof Error ? e.message : "Direct KYC failed"
					setResult({ ok: false, message })
					setStep("result")
					toast.error(message)
				}
			})()
		})
	}

	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
						Desktop verification
					</p>

					<div className="space-y-5">
						{step !== "result" && (
							<div className="flex items-center justify-between">
								<p className="text-muted-foreground text-sm">
									Step {currentStepInfo.number} of {currentStepInfo.total}: {currentStepInfo.title}
								</p>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => setIsFullscreen(prev => !prev)}
										title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
									>
										{isFullscreen ? (
											<Minimize2 className="size-3.5" />
										) : (
											<Maximize2 className="size-3.5" />
										)}
									</Button>
									<div className="flex gap-1">
										{DESKTOP_STEPS.map((s, idx) => (
											<div
												key={s}
												className={`h-1.5 w-10 rounded-full transition-colors ${
													idx < DESKTOP_STEPS.indexOf(step) + 1 ? "bg-primary" : "bg-muted"
												}`}
											/>
										))}
									</div>
								</div>
							</div>
						)}

						{step !== "result" && (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<CountryCombobox
									value={countryId}
									onChange={handleCountryChange}
									disabled={isSubmitting}
								/>
								<DocumentTypeCombobox
									countryId={countryId}
									value={documentId}
									onChange={setDocumentId}
									disabled={isSubmitting}
								/>
							</div>
						)}

						{step === "id" && (
							<div className="space-y-5">
								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
									<p className="text-sm text-blue-900 dark:text-blue-100">
										Position your ID card within the frame. Ensure all text is readable and
										there&apos;s no glare.
									</p>
								</div>
								<div className="space-y-4">
									<CameraCapture
										title=""
										description=""
										overlayVariant="document"
										initialFacingMode="environment"
										autoStart
										onCapture={setIdImage}
									/>
									{idImage ? (
										<div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
											<div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
												<CheckCircle2 className="size-4" />
												Photo captured successfully
											</div>
										</div>
									) : null}
								</div>
							</div>
						)}

						{step === "selfie" && (
							<div className="space-y-5">
								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
									<p className="text-sm text-blue-900 dark:text-blue-100">
										Center your face in the frame. Good lighting is essential. Remove glasses and
										face coverings.
									</p>
								</div>
								<div className="space-y-4">
									<CameraCapture
										title=""
										description=""
										overlayVariant="face"
										initialFacingMode="user"
										autoStart
										onCapture={setSelfieImage}
									/>
									{selfieImage ? (
										<div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
											<div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
												<CheckCircle2 className="size-4" />
												Selfie captured successfully
											</div>
										</div>
									) : null}
								</div>
							</div>
						)}

						{step === "review" && (
							<div className="space-y-5">
								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
									<p className="text-sm text-blue-900 dark:text-blue-100">
										Verify your photos are clear before submitting. Make sure your face is visible
										in both images.
									</p>
								</div>
								<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
									<div className="space-y-3">
										<Label className="text-sm font-medium">ID Document</Label>
										{idImage ? (
											<div className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img src={idImage} alt="ID" className="aspect-4/3 w-full object-cover" />
											</div>
										) : (
											<div className="bg-muted flex aspect-4/3 items-center justify-center rounded-lg border">
												<p className="text-muted-foreground text-sm">No photo</p>
											</div>
										)}
									</div>
									<div className="space-y-3">
										<Label className="text-sm font-medium">Selfie</Label>
										{selfieImage ? (
											<div className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={selfieImage}
													alt="Selfie"
													className="aspect-4/3 w-full object-cover"
												/>
											</div>
										) : (
											<div className="bg-muted flex aspect-4/3 items-center justify-center rounded-lg border">
												<p className="text-muted-foreground text-sm">No photo</p>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{step === "result" && (
							<div
								className={`rounded-lg border p-8 shadow-sm ${
									result?.ok
										? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
										: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
								}`}
							>
								<div className="flex flex-col items-center gap-4 text-center">
									{result?.ok ? (
										<div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
											<CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
										</div>
									) : (
										<div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
											<XCircle className="size-10 text-red-600 dark:text-red-400" />
										</div>
									)}
									<div className="space-y-2">
										<h3 className="text-xl font-semibold">
											{result?.ok ? "Verification Successful!" : "Verification Failed"}
										</h3>
										<p className="text-muted-foreground text-sm">{result?.message}</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</FieldGroup>
			</CardContent>

			<CardFooter className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					{step === "result" ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								reset()
								onBack()
							}}
						>
							Back to options
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleBack}
								disabled={isSubmitting}
							>
								<ArrowLeft className="mr-1 size-4" />
								Back
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={reset}
								disabled={isSubmitting}
							>
								Reset
							</Button>
						</>
					)}
				</div>

				<div>
					{step === "result" ? (
						result?.ok ? (
							<Button type="button" onClick={onNext} size="sm">
								Next
							</Button>
						) : (
							<Button
								type="button"
								size="sm"
								onClick={async () => {
									const res = await resetUserKycStatus()
									if (res.success) {
										toast.success("Ready to try again")
										reset()
									} else {
										toast.error(res.error ?? "Failed to reset")
									}
								}}
							>
								Try Again
							</Button>
						)
					) : step === "review" ? (
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting || !idImage || !selfieImage}
							size="sm"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Verifying…
								</>
							) : (
								"Submit"
							)}
						</Button>
					) : (
						<Button
							type="button"
							onClick={() => setStep(step === "id" ? "selfie" : "review")}
							disabled={!canContinue || isSubmitting}
							size="sm"
						>
							Continue
						</Button>
					)}
				</div>
			</CardFooter>
		</>
	)
}
