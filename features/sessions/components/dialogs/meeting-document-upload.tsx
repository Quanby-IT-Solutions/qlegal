"use client"

import { useCallback, useEffect, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

interface MeetingDocumentUploadProps {
	meetingId: string
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
	isEnp?: boolean
	/** Called with the dialog center coordinates when upload begins — use this to trigger the flight animation */
	onUploadStart?: (originX: number, originY: number) => void
}

export function MeetingDocumentUpload({
	meetingId,
	isOpen,
	onClose,
	onSuccess,
	isEnp = false,
	onUploadStart,
}: MeetingDocumentUploadProps) {
	// eslint-disable-next-line no-restricted-properties
	const debugLogsEnabled = process.env.NODE_ENV !== "production"
	const [documentName, setDocumentName] = useState("")
	const [description, setDescription] = useState("")
	const [notarizationType, setNotarizationType] = useState<
		"ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING" | ""
	>("")
	const [fees, setFees] = useState("")
	const [feesError, setFeesError] = useState<string | null>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isUploading, setIsUploading] = useState(false)

	useEffect(() => {
		if (!debugLogsEnabled) return
		console.log("[sessions][upload] MeetingDocumentUpload open-state", {
			meetingId,
			isOpen,
			ts: new Date().toISOString(),
		})
	}, [debugLogsEnabled, isOpen, meetingId])

	// Fetch meeting details to find the ENP participant's pricing.
	// getById already returns participants with enpProfile pricing columns
	// (joined via getAppointmentParticipantsByMeetingId) for both ENP and Principal users.
	const { data: meetingDetails } = trpc.meetings.getById.useQuery(meetingId, {
		enabled: isOpen && !!meetingId,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	})

	// For ENP: find their own profile in the participant list.
	// For Principal: find the first ENP-role participant's pricing profile.
	const pricingProfile = meetingDetails?.participants?.find(p => p.user?.role === "ENP")?.user
		?.enpProfile

	// Auto-fill fees whenever the notarization type changes and a pricing profile is available.
	// Always overwrites so switching type always reflects the correct default price.
	useEffect(() => {
		if (!pricingProfile || !notarizationType) return

		let defaultFee = 0
		switch (notarizationType) {
			case "ACKNOWLEDGMENT":
				defaultFee = pricingProfile.acknowledgmentPrice ?? 0
				break
			case "AFFIRMATION":
				defaultFee = pricingProfile.affirmationPrice ?? 0
				break
			case "JURAT":
				defaultFee = pricingProfile.juratPrice ?? 0
				break
			case "SIGNATURE_WITNESSING":
				defaultFee = pricingProfile.signatureWitnessingPrice ?? 0
				break
		}

		setFees(defaultFee > 0 ? defaultFee.toFixed(2) : "")
	}, [notarizationType, pricingProfile])

	// tRPC mutation for uploading documents
	const uploadDocument = trpc.meetings.uploadDocument.useMutation({
		onSuccess: data => {
			toast.success("Document uploaded successfully!")
			if (data && typeof data === "object" && "docoChain" in data) {
				const doco = (data as { docoChain?: { projectCreated?: boolean; error?: string } })
					.docoChain
				if (doco?.projectCreated === false) {
					toast.error("DocOnChain is temporarily unavailable", {
						description:
							doco.error ??
							"Your PDF was uploaded, but project creation timed out. Please retry creating the project in a moment.",
					})
				}
			}
			// Reset form and state
			setIsUploading(false)
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
			setNotarizationType("")
			setFees("")
			setFeesError(null)
			onClose()
			onSuccess?.()
		},
		onError: error => {
			toast.error(error.message || "Failed to upload document")
			setIsUploading(false)
		},
	})

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0]
		if (!file) return

		// Validate file type - only PDF for now
		if (file.type !== "application/pdf") {
			toast.error("Only PDF files are supported")
			return
		}

		// Validate file size (10MB limit)
		const maxSize = 10 * 1024 * 1024 // 10MB
		if (file.size > maxSize) {
			toast.error("File size must be less than 10MB")
			return
		}

		setSelectedFile(file)
		setDocumentName(file.name.replace(".pdf", ""))
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
		},
		multiple: false,
		disabled: isUploading,
	})

	const handleUpload = async () => {
		const startMs = performance.now()
		if (debugLogsEnabled) {
			console.log("[sessions][upload] handleUpload click", {
				meetingId,
				hasSelectedFile: Boolean(selectedFile),
				documentName: documentName.trim() || null,
				notarizationType: notarizationType || null,
			})
		}
		if (!selectedFile) {
			toast.error("Please select a file")
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: no file", {
					meetingId,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		if (!documentName.trim()) {
			toast.error("Please enter a document name")
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: no documentName", {
					meetingId,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		if (!notarizationType) {
			toast.error("Please select a notarization type")
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: no notarizationType", {
					meetingId,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		const feesTrimmed = fees.trim()
		if (feesTrimmed === "") {
			const msg =
				"Please enter the notarization fee in PHP. It is required for the notarial book entry."
			setFeesError(msg)
			toast.error(msg)
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: empty fees", {
					meetingId,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		const feesNum = Number.parseFloat(feesTrimmed.replace(/,/g, ""))
		if (!Number.isFinite(feesNum) || feesNum < 0) {
			const msg = "Fees must be a valid non-negative number."
			setFeesError(msg)
			toast.error(msg)
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: invalid fees", {
					meetingId,
					feesRaw: fees,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		if (feesNum <= 0) {
			const msg =
				"Enter a fee greater than zero (PHP). If your profile has no default price for this act, type the amount here."
			setFeesError(msg)
			toast.error(msg)
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload blocked: zero fees", {
					meetingId,
					feesRaw: fees,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}

		setFeesError(null)
		setIsUploading(true)

		// Fire animation origin: center of the viewport (dialog is centered)
		if (onUploadStart) {
			onUploadStart(window.innerWidth / 2, window.innerHeight / 2)
		}

		try {
			// Convert file to base64
			const base64StartMs = performance.now()
			const base64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => {
					const result = reader.result as string
					// Remove data URL prefix
					const base64Data = result.split(",")[1]
					if (base64Data) {
						resolve(base64Data)
					} else {
						reject(new Error("Failed to convert file to base64"))
					}
				}
				reader.onerror = reject
				reader.readAsDataURL(selectedFile)
			})
			if (debugLogsEnabled) {
				console.log("[sessions][upload] base64 ready", {
					meetingId,
					base64Ms: Math.round(performance.now() - base64StartMs),
					fileSizeBytes: selectedFile.size,
				})
			}

			// Upload document
			if (debugLogsEnabled) {
				console.log("[sessions][upload] uploadDocument.mutate start", {
					meetingId,
					name: documentName.trim(),
					mimeType: selectedFile.type,
					size: selectedFile.size,
					fees: feesNum,
				})
			}
			uploadDocument.mutate({
				meetingId,
				name: documentName.trim(),
				file: base64,
				mimeType: selectedFile.type,
				size: selectedFile.size,
				description: description.trim() || undefined,
				notarizationType,
				fees: feesNum,
			})
		} catch (error) {
			console.error("Upload error:", error)
			toast.error("Failed to upload document")
			setIsUploading(false)
			if (debugLogsEnabled) {
				console.log("[sessions][upload] handleUpload error", {
					meetingId,
					message: error instanceof Error ? error.message : String(error),
					totalMs: Math.round(performance.now() - startMs),
				})
			}
		}
	}

	const handleClose = () => {
		if (isUploading) return
		// Reset all state
		setIsUploading(false)
		setSelectedFile(null)
		setDocumentName("")
		setDescription("")
		setNotarizationType("")
		setFees("")
		setFeesError(null)
		onClose()
	}

	// Reset state when dialog closes
	const handleOpenChange = (open: boolean) => {
		if (debugLogsEnabled) {
			console.log("[sessions][upload] dialog onOpenChange", {
				meetingId,
				open,
				isUploading,
			})
		}
		if (!open && !isUploading) {
			// Reset state when dialog is closed (only if not uploading)
			setIsUploading(false)
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
			setNotarizationType("")
			setFees("")
			setFeesError(null)
			onClose()
		} else if (!open) {
			// If uploading, just close without resetting (upload will handle reset)
			onClose()
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[95vw] sm:max-w-lg lg:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Upload className="size-5" />
						Upload Document
					</DialogTitle>
					<DialogDescription>
						Upload a document to share with meeting participants
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* File Drop Zone */}
					{!selectedFile ? (
						<div
							{...getRootProps()}
							className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-6 ${
								isDragActive
									? "border-primary bg-primary/10"
									: "hover:border-primary border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
							} ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
						>
							<input {...getInputProps()} />
							<div className="flex flex-col items-center gap-2 sm:gap-3">
								<div className="bg-primary/10 rounded-full p-2 sm:p-3">
									<FileText className="text-primary size-6 sm:size-7" />
								</div>
								{isDragActive ? (
									<div>
										<p className="text-primary text-base font-medium sm:text-lg">
											Drop your PDF here
										</p>
										<p className="text-xs text-gray-500 sm:text-sm">
											Release to upload the document
										</p>
									</div>
								) : (
									<div>
										<p className="text-base font-medium text-gray-900 sm:text-lg dark:text-gray-100">
											Drag & drop your PDF here
										</p>
										<p className="text-xs text-gray-500 sm:text-sm">or click to browse files</p>
										<p className="mt-1 text-xs text-gray-400">Maximum file size: 10MB</p>
									</div>
								)}
							</div>
						</div>
					) : (
						/* Selected File Display */
						<div className="rounded-lg border border-gray-200 p-3 sm:p-4 dark:border-gray-800">
							<div className="flex items-center gap-3">
								<div className="rounded bg-red-100 p-2 dark:bg-red-900/30">
									<FileText className="size-5 text-red-600 dark:text-red-400" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
										{selectedFile.name}
									</p>
									<p className="text-xs text-gray-500">
										{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setSelectedFile(null)}
									disabled={isUploading}
									className="text-gray-400 hover:text-red-500"
								>
									<X className="size-4" />
								</Button>
							</div>
						</div>
					)}

					{/* Document Details Form - Responsive grid layout */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="document-name">Document Name</Label>
							<Input
								id="document-name"
								value={documentName}
								onChange={e => setDocumentName(e.target.value)}
								placeholder="Enter document name"
								disabled={isUploading || !selectedFile}
							/>
						</div>

						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="notarization-type">
								Notarization Type <span className="text-red-500">*</span>
							</Label>
							<Select
								value={notarizationType}
								onValueChange={value =>
									setNotarizationType(
										value as "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"
									)
								}
								disabled={isUploading || !selectedFile}
							>
								<SelectTrigger id="notarization-type">
									<SelectValue placeholder="Select notarization type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ACKNOWLEDGMENT">Acknowledgment</SelectItem>
									<SelectItem value="AFFIRMATION">Affirmation or Oath</SelectItem>
									<SelectItem value="JURAT">Jurat</SelectItem>
									<SelectItem value="SIGNATURE_WITNESSING">Signature Witnessing</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-muted-foreground text-xs">
								Required for notarial book entry (Rule IV, eNotarization)
							</p>
						</div>

						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="description">Description (Optional)</Label>
							<Textarea
								id="description"
								value={description}
								onChange={e => setDescription(e.target.value)}
								placeholder="Enter a brief description of the document"
								rows={2}
								disabled={isUploading || !selectedFile}
								className="resize-none"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="fees">
								Fees (PHP) <span className="text-red-500">*</span>
							</Label>
							<Input
								id="fees"
								type="number"
								step="0.01"
								min={0}
								value={fees}
								onChange={e => {
									setFees(e.target.value)
									setFeesError(null)
								}}
								placeholder="0.00"
								disabled={isUploading || !selectedFile}
								aria-invalid={feesError ? true : undefined}
								aria-describedby={feesError ? "fees-error" : undefined}
							/>
							{feesError ? (
								<p id="fees-error" className="text-destructive text-xs" role="alert">
									{feesError}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									{isEnp
										? "Auto-filled from your profile pricing when available. You must enter a fee greater than zero."
										: pricingProfile
											? "Auto-filled from ENP participant's pricing when available. You must enter a fee greater than zero."
											: "Enter the notarization fee for this document (required, greater than zero)."}
								</p>
							)}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isUploading}>
						Cancel
					</Button>
					<Button
						onClick={handleUpload}
						disabled={isUploading || !selectedFile || !documentName.trim() || !notarizationType}
					>
						{isUploading ? (
							<>
								<div className="mr-2 size-4 animate-spin rounded-full border-b-2 border-white"></div>
								Uploading...
							</>
						) : (
							<>
								<Upload className="mr-2 size-4" />
								Upload Document
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
