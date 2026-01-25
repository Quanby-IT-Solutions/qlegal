"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, FileCheck, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"

import { runDirectKycVerification } from "@/features/kyc/api/kyc.actions"
import { CameraCapture } from "@/features/kyc/components/camera-capture"

type DirectKycStep = "id" | "selfie" | "review" | "result"

// Common countries for KYC verification
const COUNTRIES = [
	{ value: "phl", label: "Philippines" },
	{ value: "ind", label: "India" },
	{ value: "usa", label: "United States" },
	{ value: "gbr", label: "United Kingdom" },
	{ value: "sgp", label: "Singapore" },
	{ value: "aus", label: "Australia" },
	{ value: "can", label: "Canada" },
] as const

// Common document types
const DOCUMENT_TYPES = [
	{ value: "dl", label: "Driver's License" },
	{ value: "national_id", label: "National ID" },
	{ value: "passport", label: "Passport" },
	{ value: "voter_id", label: "Voter ID" },
] as const

export function DirectKycDialog(props: { disabled?: boolean; variant?: "default" | "secondary" }) {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<DirectKycStep>("id")
	const [countryId, setCountryId] = useState("phl")
	const [documentId, setDocumentId] = useState("dl")
	const [idImage, setIdImage] = useState<string | null>(null)
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
	const [selfieImage, setSelfieImage] = useState<string | null>(null)
	const [result, setResult] = useState<null | { ok: boolean; message: string; status?: string; transactionId?: string }>(null)
	const [isPending, startTransition] = useTransition()

	const canGoNext = useMemo(() => {
		if (step === "id") return !!idImage && !!countryId && !!documentId
		if (step === "selfie") return !!selfieImage
		return true
	}, [countryId, documentId, idImage, selfieImage, step])

	const reset = () => {
		setStep("id")
		setIdImage(null)
		setUploadedFileName(null)
		setSelfieImage(null)
		setResult(null)
	}

	const close = () => {
		setOpen(false)
		reset()
	}

	const readFileAsDataUrl = async (file: File): Promise<string> => {
		return await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => {
				const result = reader.result
				if (typeof result === "string" && result.startsWith("data:")) return resolve(result)
				return reject(new Error("Failed to read file"))
			}
			reader.onerror = () => reject(new Error("Failed to read file"))
			reader.readAsDataURL(file)
		})
	}

	const submit = () => {
		if (!idImage || !selfieImage) return

		startTransition(() => {
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
						toast.success("KYC verified! Redirecting…")
						setTimeout(() => {
							window.location.href = "/dashboard"
						}, 1200)
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
		<Dialog open={open} onOpenChange={nextOpen => (nextOpen ? setOpen(true) : close())}>
			<DialogTrigger asChild>
				<Button
					disabled={props.disabled}
					variant={props.variant ?? "secondary"}
					className="w-full"
					size="lg"
					type="button"
				>
					<ShieldCheck className="mr-2 h-5 w-5" />
					Desktop Camera Verification
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Identity Verification</DialogTitle>
					<DialogDescription>
						Complete your verification in 3 simple steps
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{step !== "result" && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="countryId">Country</Label>
								<Select value={countryId} onValueChange={setCountryId}>
									<SelectTrigger id="countryId">
										<SelectValue placeholder="Select country" />
									</SelectTrigger>
									<SelectContent>
										{COUNTRIES.map(country => (
											<SelectItem key={country.value} value={country.value}>
												{country.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="documentId">Document Type</Label>
								<Select value={documentId} onValueChange={setDocumentId}>
									<SelectTrigger id="documentId">
										<SelectValue placeholder="Select document" />
									</SelectTrigger>
									<SelectContent>
										{DOCUMENT_TYPES.map(doc => (
											<SelectItem key={doc.value} value={doc.value}>
												{doc.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}

					{step === "id" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold">Step 1: Capture ID Document</h3>
								<p className="text-muted-foreground text-xs">
									Position your ID card within the frame. Ensure all text is readable and there's no glare.
								</p>
							</div>

							<CameraCapture
								title=""
								description=""
								overlayVariant="document"
								initialFacingMode="environment"
								autoStart
								onCapture={imageData => {
									setIdImage(imageData)
									setUploadedFileName(null)
								}}
							/>

							<div className="rounded-lg border bg-muted/30 p-4">
								<p className="mb-2 text-sm font-medium">Or upload a photo</p>
								<div className="flex flex-col gap-3">
									<div className="relative">
										<Input
											type="file"
											accept="image/*"
											id="id-file-upload"
											className="hidden"
											onChange={e => {
												void (async () => {
													const file = e.target.files?.[0]
													if (!file) return

													// 6MB safety limit (Face Match API constraint)
													if (file.size > 6 * 1024 * 1024) {
														toast.error("File too large. Max 6MB allowed.")
														e.target.value = ""
														return
													}

													try {
														const dataUrl = await readFileAsDataUrl(file)
														setIdImage(dataUrl)
														setUploadedFileName(file.name)
														toast.success("Photo uploaded successfully.")
													} catch (err) {
														const message =
															err instanceof Error ? err.message : "Failed to read file"
														toast.error(message)
													} finally {
														e.target.value = ""
													}
												})()
											}}
										/>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={() => document.getElementById("id-file-upload")?.click()}
										>
											{uploadedFileName ? (
												<>
													<FileCheck className="mr-2 size-4 text-green-600" />
													{uploadedFileName}
												</>
											) : (
												<>
													<Upload className="mr-2 size-4" />
													Choose File
												</>
											)}
										</Button>
									</div>
									{uploadedFileName && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												setIdImage(null)
												setUploadedFileName(null)
											}}
										>
											Remove file
										</Button>
									)}
									<p className="text-muted-foreground text-xs">Clear, well-lit image under 6MB</p>
								</div>
							</div>
						</div>
					)}

					{step === "selfie" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold">Step 2: Capture Selfie</h3>
								<p className="text-muted-foreground text-xs">
									Center your face in the frame. Good lighting is essential. Remove glasses and face coverings.
								</p>
							</div>

							<CameraCapture
								title=""
								description=""
								overlayVariant="face"
								initialFacingMode="user"
								autoStart
								onCapture={setSelfieImage}
							/>
						</div>
					)}

					{step === "review" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold">Step 3: Review & Submit</h3>
								<p className="text-muted-foreground text-xs">
									Verify your photos are clear before submitting.
								</p>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label className="text-xs">ID Document</Label>
									{idImage ? (
										<div className="relative overflow-hidden rounded-lg border">
											<img src={idImage} alt="ID" className="aspect-video w-full object-cover" />
										</div>
									) : (
										<div className="bg-muted flex aspect-video items-center justify-center rounded-lg border">
											<p className="text-muted-foreground text-xs">No photo</p>
										</div>
									)}
								</div>
								<div className="space-y-2">
									<Label className="text-xs">Selfie</Label>
									{selfieImage ? (
										<div className="relative overflow-hidden rounded-lg border">
											<img src={selfieImage} alt="Selfie" className="aspect-video w-full object-cover" />
										</div>
									) : (
										<div className="bg-muted flex aspect-video items-center justify-center rounded-lg border">
											<p className="text-muted-foreground text-xs">No photo</p>
										</div>
									)}
								</div>
							</div>

							<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-100">
								Make sure your face is visible in the ID photo for best results.
							</div>
						</div>
					)}

					{step === "result" && (
						<div
							className={`rounded-lg border p-6 ${
								result?.ok
									? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
									: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
							}`}
						>
							<div className="flex flex-col items-center gap-3 text-center">
								{result?.ok ? (
									<CheckCircle2 className="size-12 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="size-12 text-red-600 dark:text-red-400" />
								)}
								<div className="space-y-2">
									<p className="text-lg font-semibold">
										{result?.ok ? "Verification Successful!" : "Verification Failed"}
									</p>
									<p className="text-muted-foreground text-sm">{result?.message}</p>
									{result?.transactionId && (
										<p className="text-muted-foreground text-xs">ID: {result.transactionId}</p>
									)}
								</div>
							</div>
						</div>
					)}

					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						{step !== "result" && (
							<Button
								variant="ghost"
								type="button"
								onClick={reset}
								disabled={isPending}
								size="lg"
							>
								Reset
							</Button>
						)}

						{step !== "result" && step !== "id" && (
							<Button
								variant="outline"
								type="button"
								onClick={() => setStep(prev => (prev === "selfie" ? "id" : "selfie"))}
								disabled={isPending}
								size="lg"
							>
								Back
							</Button>
						)}

						{step === "result" ? (
							<Button
								variant="default"
								type="button"
								onClick={close}
								className="w-full sm:w-auto"
								size="lg"
							>
								Close
							</Button>
						) : step !== "review" ? (
							<Button
								type="button"
								onClick={() => setStep(prev => (prev === "id" ? "selfie" : "review"))}
								disabled={!canGoNext || isPending}
								size="lg"
							>
								Continue
							</Button>
						) : (
							<Button
								type="button"
								onClick={submit}
								disabled={isPending || !idImage || !selfieImage}
								size="lg"
							>
								{isPending ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Verifying…
									</>
								) : (
									"Submit"
								)}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

