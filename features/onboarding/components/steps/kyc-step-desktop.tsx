"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { CheckCircle2, Loader2, Maximize2, Minimize2, RefreshCw, XCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Label } from "@/core/components/ui/label"

import { resetUserKycStatus, runDirectKycVerification } from "@/features/kyc/api/kyc.actions"
import { CameraCapture, type CameraCaptureHandle } from "@/features/kyc/components/camera-capture"
import { CountryCombobox } from "@/features/kyc/components/country-combobox"
import { DocumentTypeCombobox } from "@/features/kyc/components/document-type-combobox"
import { getDocumentTypes } from "@/features/kyc/lib/supported-documents"

const DESKTOP_STEP_CONFIG = {
	id: { number: 1, total: 3, title: "Capture ID Document" },
	selfie: { number: 2, total: 3, title: "Capture Selfie" },
	review: { number: 3, total: 3, title: "Review & Submit" },
	result: { number: 3, total: 3, title: "Verification Result" },
} as const

const DESKTOP_STEPS = ["id", "selfie", "review"] as const

type DesktopStep = "id" | "selfie" | "review" | "result"

interface KycDesktopFlowProps {
	onNext: () => void
	onBack: () => void
	onExpandChange?: (expanded: boolean) => void
	onContinueOnMobile?: () => void
	onStartOver?: () => void | Promise<void>
}

export function KycDesktopFlow({
	onNext,
	onBack,
	onExpandChange,
	onContinueOnMobile,
	onStartOver,
}: KycDesktopFlowProps) {
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
	const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user")
	const idCaptureRef = useRef<CameraCaptureHandle>(null)
	const selfieCaptureRef = useRef<CameraCaptureHandle>(null)

	const handleCountryChange = (newCountryId: string) => {
		setCountryId(newCountryId)
		const newDocs = getDocumentTypes(newCountryId)
		if (!newDocs.some(d => d.value === documentId)) {
			setDocumentId(newDocs[0]?.value ?? "")
		}
	}

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

	const captureSuccessBanner =
		step === "id" && idImage ? (
			<Alert variant="success">
				<CheckCircle2 className="size-4" />
				<AlertTitle>Photo captured successfully</AlertTitle>
			</Alert>
		) : step === "selfie" && selfieImage ? (
			<Alert variant="success">
				<CheckCircle2 className="size-4" />
				<AlertTitle>Selfie captured successfully</AlertTitle>
			</Alert>
		) : null

	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
							Desktop verification
						</p>

						{step !== "result" ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7"
								onClick={() => setIsFullscreen(prev => !prev)}
								title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
							>
								{isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
							</Button>
						) : null}
					</div>

					<div className="space-y-5">
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
									{idImage ? (
										<>
											<div className="overflow-hidden rounded-lg border shadow-sm">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={idImage}
													alt="ID document"
													className="aspect-4/3 w-full object-cover"
												/>
											</div>
										</>
									) : (
										<CameraCapture
											ref={idCaptureRef}
											title=""
											description=""
											overlayVariant="document"
											initialFacingMode={cameraFacingMode}
											onFacingModeChange={setCameraFacingMode}
											autoStart
											captureButtonInFooter
											onCapture={setIdImage}
										/>
									)}
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
									{selfieImage ? (
										<>
											<div className="overflow-hidden rounded-lg border shadow-sm">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={selfieImage}
													alt="Selfie"
													className="aspect-4/3 w-full object-cover"
												/>
											</div>
										</>
									) : (
										<CameraCapture
											ref={selfieCaptureRef}
											title=""
											description=""
											overlayVariant="face"
											initialFacingMode={cameraFacingMode}
											onFacingModeChange={setCameraFacingMode}
											autoStart
											captureButtonInFooter
											onCapture={setSelfieImage}
										/>
									)}
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
							<Alert
								variant={
									result?.status === "VERIFIED"
										? "success"
										: result?.status === "PENDING"
											? "warning"
											: "destructive"
								}
								className="px-4 py-3"
							>
								{result?.status === "VERIFIED" ? (
									<CheckCircle2 className="size-4" />
								) : result?.status === "PENDING" ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<XCircle className="size-4" />
								)}
								<AlertTitle>
									{result?.status === "VERIFIED"
										? "Verification successful"
										: result?.status === "PENDING"
											? "Verification submitted"
											: "Verification failed"}
								</AlertTitle>
								<AlertDescription>
									{result?.status === "PENDING" ? (
										<p className="text-muted-foreground">
											Your verification is pending manual review. We&apos;ll notify you once it&apos;s
											complete.
										</p>
									) : result?.status !== "VERIFIED" && result?.message ? (
										<p>
											{result.message.includes("API error") ||
											result.message.includes("{") ||
											result.message.length > 200
												? "We couldn't complete verification. Please check your photos and try again."
												: result.message}
										</p>
									) : null}
								</AlertDescription>
							</Alert>
						)}
					</div>

					{step !== "result" ? (
						<div className="flex justify-center">
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
					) : null}
				</FieldGroup>
			</CardContent>

			{captureSuccessBanner ? <CardContent className="px-2!">{captureSuccessBanner}</CardContent> : null}

			<CardFooter className="flex items-center justify-between gap-2">
				{step === "id" ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							setIdImage(null)
							setIsFullscreen(false)
						}}
						disabled={isSubmitting}
					>
						<RefreshCw className="mr-1 size-4" />
						Retake
					</Button>
				) : step === "selfie" ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							setSelfieImage(null)
							setIsFullscreen(false)
						}}
						disabled={isSubmitting}
					>
						<RefreshCw className="mr-1 size-4" />
						Retake
					</Button>
				) : step === "result" ? (
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
					<div />
				)}

				<div className="flex items-center gap-2">
					{step === "result" ? null : (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleBack}
							disabled={isSubmitting}
						>
							Back
						</Button>
					)}
					{step === "result" ? (
						result?.status === "PENDING" ? (
							<Button
								type="button"
								size="sm"
								onClick={async () => {
									if (onStartOver) {
										await onStartOver()
										reset()
										onBack()
										return
									}

									const res = await resetUserKycStatus()
									if (res.success) {
										toast.success("Ready to try again")
										reset()
										onBack()
									} else {
										toast.error(res.error ?? "Failed to reset")
									}
								}}
							>
								Start over
							</Button>
						) : result?.ok ? (
							<Button type="button" onClick={onNext} size="sm">
								Next
							</Button>
						) : (
							<Button
								type="button"
								size="sm"
								onClick={async () => {
									if (onStartOver) {
										await onStartOver()
										reset()
										return
									}

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
					) : step === "id" && !idImage ? (
						<Button
							type="button"
							size="sm"
							onClick={() => idCaptureRef.current?.capture()}
							disabled={isSubmitting}
						>
							Capture
						</Button>
					) : step === "selfie" && !selfieImage ? (
						<Button
							type="button"
							size="sm"
							onClick={() => selfieCaptureRef.current?.capture()}
							disabled={isSubmitting}
						>
							Capture
						</Button>
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
							disabled={isSubmitting}
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
