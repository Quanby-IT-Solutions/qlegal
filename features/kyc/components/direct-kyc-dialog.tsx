"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, FileCheck, Loader2, ShieldCheck, Upload, XCircle, ArrowLeft } from "lucide-react"
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

const STEP_CONFIG = {
	id: { number: 1, total: 3, title: "Capture ID Document" },
	selfie: { number: 2, total: 3, title: "Capture Selfie" },
	review: { number: 3, total: 3, title: "Review & Submit" },
	result: { number: 3, total: 3, title: "Verification Result" },
}

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

	const currentStep = STEP_CONFIG[step]

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

			<DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-hidden p-0">
				<div className="flex max-h-[90vh] flex-col overflow-hidden rounded-lg">
					<div className="sticky top-0 z-10 shrink-0 rounded-t-lg border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<DialogHeader className="px-6 pb-4 pt-6">
						<div className="flex items-start justify-between">
							<div className="space-y-1.5">
								<DialogTitle className="text-xl">Identity Verification</DialogTitle>
								<DialogDescription>
									Step {currentStep.number} of {currentStep.total}: {currentStep.title}
								</DialogDescription>
							</div>
							{step !== "result" && (
								<div className="flex gap-1">
									{(["id", "selfie", "review"] as const).map((s, idx) => (
										<div
											key={s}
											className={`h-1.5 w-12 rounded-full transition-colors ${
												idx < (["id", "selfie", "review"] as const).indexOf(step) + 1
													? "bg-primary"
													: "bg-muted"
											}`}
										/>
									))}
								</div>
							)}
						</div>
					</DialogHeader>
				</div>

				<div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-4">
					{step !== "result" && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="countryId" className="text-sm font-medium">
									Country
								</Label>
								<Select value={countryId} onValueChange={setCountryId} disabled={isPending}>
									<SelectTrigger id="countryId" className="h-11">
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
								<Label htmlFor="documentId" className="text-sm font-medium">
									Document Type
								</Label>
								<Select value={documentId} onValueChange={setDocumentId} disabled={isPending}>
									<SelectTrigger id="documentId" className="h-11">
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
						<div className="space-y-5">
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
								<p className="text-sm text-blue-900 dark:text-blue-100">
									Position your ID card within the frame. Ensure all text is readable and there's no glare.
								</p>
							</div>

							<div className="space-y-4">
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

								{idImage && !uploadedFileName && (
									<div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
										<div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
											<CheckCircle2 className="size-4" />
											Photo captured successfully
										</div>
									</div>
								)}
							</div>

							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">Or upload from device</span>
								</div>
							</div>

							<div className="space-y-3 rounded-lg border bg-muted/30 p-4">
								<Input
									type="file"
									accept="image/*"
									id="id-file-upload"
									className="hidden"
									onChange={e => {
										void (async () => {
											const file = e.target.files?.[0]
											if (!file) return

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
												const message = err instanceof Error ? err.message : "Failed to read file"
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
									className="h-11 w-full"
									onClick={() => document.getElementById("id-file-upload")?.click()}
								>
									{uploadedFileName ? (
										<>
											<FileCheck className="mr-2 size-4 text-green-600" />
											<span className="truncate">{uploadedFileName}</span>
										</>
									) : (
										<>
											<Upload className="mr-2 size-4" />
											Choose File
										</>
									)}
								</Button>
								{uploadedFileName && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-9 w-full"
										onClick={() => {
											setIdImage(null)
											setUploadedFileName(null)
										}}
									>
										Remove file
									</Button>
								)}
								<p className="text-center text-xs text-muted-foreground">
									Clear, well-lit image under 6MB
								</p>
							</div>
						</div>
					)}

					{step === "selfie" && (
						<div className="space-y-5">
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
								<p className="text-sm text-blue-900 dark:text-blue-100">
									Center your face in the frame. Good lighting is essential. Remove glasses and face coverings.
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

								{selfieImage && (
									<div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
										<div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
											<CheckCircle2 className="size-4" />
											Selfie captured successfully
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{step === "review" && (
						<div className="space-y-5">
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
								<p className="text-sm text-blue-900 dark:text-blue-100">
									Verify your photos are clear before submitting. Make sure your face is visible in both images.
								</p>
							</div>

							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								<div className="space-y-3">
									<Label className="text-sm font-medium">ID Document</Label>
									{idImage ? (
										<div className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
											<img src={idImage} alt="ID" className="aspect-[4/3] w-full object-cover" />
											<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
										</div>
									) : (
										<div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted">
											<p className="text-sm text-muted-foreground">No photo</p>
										</div>
									)}
								</div>
								<div className="space-y-3">
									<Label className="text-sm font-medium">Selfie</Label>
									{selfieImage ? (
										<div className="group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
											<img src={selfieImage} alt="Selfie" className="aspect-[4/3] w-full object-cover" />
											<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
										</div>
									) : (
										<div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted">
											<p className="text-sm text-muted-foreground">No photo</p>
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
									<p className="text-sm text-muted-foreground">{result?.message}</p>
									{result?.transactionId && (
										<p className="font-mono text-xs text-muted-foreground">
											Transaction ID: {result.transactionId}
										</p>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="sticky bottom-0 shrink-0 rounded-b-lg border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
							{step !== "result" && (
								<Button
									variant="ghost"
									type="button"
									onClick={reset}
									disabled={isPending}
									size="lg"
									className="h-11"
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
									className="h-11"
								>
									<ArrowLeft className="mr-2 size-4" />
									Back
								</Button>
							)}
						</div>

						<div className="flex gap-2">
							{step === "result" ? (
								<Button
									variant="default"
									type="button"
									onClick={close}
									className="h-11 w-full sm:w-auto sm:min-w-32"
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
									className="h-11 w-full sm:w-auto sm:min-w-32"
								>
									Continue
								</Button>
							) : (
								<Button
									type="button"
									onClick={submit}
									disabled={isPending || !idImage || !selfieImage}
									size="lg"
									className="h-11 w-full sm:w-auto sm:min-w-32"
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
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}