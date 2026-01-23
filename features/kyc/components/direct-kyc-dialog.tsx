"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { runDirectKycVerification } from "@/features/kyc/api/kyc.actions"
import { CameraCapture } from "@/features/kyc/components/camera-capture"

type DirectKycStep = "id" | "selfie" | "review" | "result"

export function DirectKycDialog(props: { disabled?: boolean; variant?: "default" | "secondary" }) {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<DirectKycStep>("id")
	const [countryId, setCountryId] = useState("phl")
	const [documentId, setDocumentId] = useState("dl")
	const [idImage, setIdImage] = useState<string | null>(null)
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
					Start Verification (Desktop Camera)
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Verify using Desktop Camera (No QR)</DialogTitle>
					<DialogDescription>
						This flow captures your ID and selfie in-app, then validates using HyperVerge direct APIs:{" "}
						`readId`, `checkLiveness`, `matchFace`.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{step !== "result" && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor="countryId">Country ID (3-letter)</Label>
								<Input
									id="countryId"
									value={countryId}
									onChange={e => setCountryId(e.target.value)}
									placeholder="e.g. phl"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="documentId">Document ID</Label>
								<Input
									id="documentId"
									value={documentId}
									onChange={e => setDocumentId(e.target.value)}
									placeholder="e.g. dl"
								/>
							</div>
						</div>
					)}

					{step === "id" && (
						<div className="space-y-3">
							<CameraCapture
								title="Step 1 — Capture your ID (front)"
								description="Hold your ID steady inside the box. Make sure text is sharp and glare-free."
								overlayVariant="document"
								initialFacingMode="environment"
								autoStart
								onCapture={setIdImage}
							/>

							<div className="rounded-lg border p-3">
								<p className="text-sm font-medium">Or upload an ID photo</p>
								<p className="text-muted-foreground mt-1 text-xs">
									Use a clear, well-lit image. Keep it under 6MB (HyperVerge Face Match limit).
								</p>
								<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
									<Input
										type="file"
										accept="image/*"
										onChange={e => {
											void (async () => {
												const file = e.target.files?.[0]
												if (!file) return

												// 6MB safety limit (Face Match API constraint)
												if (file.size > 6 * 1024 * 1024) {
													toast.error("File too large. Please upload an image under 6MB.")
													e.target.value = ""
													return
												}

												try {
													const dataUrl = await readFileAsDataUrl(file)
													setIdImage(dataUrl)
													toast.success("ID image uploaded.")
												} catch (err) {
													const message =
														err instanceof Error ? err.message : "Failed to read the uploaded file"
													toast.error(message)
												} finally {
													// allow re-uploading the same file
													e.target.value = ""
												}
											})()
										}}
									/>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIdImage(null)}
										disabled={!idImage}
									>
										Clear
									</Button>
								</div>
							</div>
						</div>
					)}

					{step === "selfie" && (
						<CameraCapture
							title="Step 2 — Capture your selfie"
							description="Center your face in the oval. Ensure good lighting and remove face coverings."
							overlayVariant="face"
							initialFacingMode="user"
							autoStart
							onCapture={setSelfieImage}
						/>
					)}

					{step === "review" && (
						<div className="space-y-3">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="space-y-2">
									<p className="text-sm font-medium">ID Photo</p>
									{idImage ? (
										<img src={idImage} alt="ID capture" className="w-full rounded-lg border object-cover" />
									) : (
										<p className="text-muted-foreground text-xs">Missing</p>
									)}
								</div>
								<div className="space-y-2">
									<p className="text-sm font-medium">Selfie Photo</p>
									{selfieImage ? (
										<img
											src={selfieImage}
											alt="Selfie capture"
											className="w-full rounded-lg border object-cover"
										/>
									) : (
										<p className="text-muted-foreground text-xs">Missing</p>
									)}
								</div>
							</div>

							<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
								Tip: If face match fails, retake the ID photo with the face area clearly visible and less glare.
							</div>
						</div>
					)}

					{step === "result" && (
						<div
							className={`rounded-lg border p-4 ${
								result?.ok
									? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
									: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
							}`}
						>
							<div className="flex items-start gap-3">
								{result?.ok ? (
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
								)}
								<div className="flex-1 space-y-1">
									<p className="font-medium">
										{result?.status ? `Status: ${result.status}` : result?.ok ? "Verified" : "Not verified"}
									</p>
									<p className="text-sm">{result?.message}</p>
									{result?.transactionId && (
										<p className="text-muted-foreground text-xs">Transaction ID: {result.transactionId}</p>
									)}
								</div>
							</div>
						</div>
					)}

					<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
						<Button
							variant="outline"
							type="button"
							onClick={() => {
								if (step === "result") return close()
								reset()
							}}
							disabled={isPending}
						>
							{step === "result" ? "Close" : "Reset"}
						</Button>

						{step !== "result" && (
							<>
								{step !== "id" && (
									<Button
										variant="secondary"
										type="button"
										onClick={() => setStep(prev => (prev === "selfie" ? "id" : "selfie"))}
										disabled={isPending}
									>
										Back
									</Button>
								)}

								{step !== "review" ? (
									<Button
										type="button"
										onClick={() => setStep(prev => (prev === "id" ? "selfie" : "review"))}
										disabled={!canGoNext || isPending}
									>
										Next
									</Button>
								) : (
									<Button type="button" onClick={submit} disabled={isPending || !idImage || !selfieImage}>
										{isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Verifying…
											</>
										) : (
											"Submit Verification"
										)}
									</Button>
								)}
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

