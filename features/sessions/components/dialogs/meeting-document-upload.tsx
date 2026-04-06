"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, FileText, Folder, Upload, X } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

function formatVaultFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

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

	const [uploadSource, setUploadSource] = useState<"file" | "vault">("file")
	const [vaultStep, setVaultStep] = useState<"browse" | "confirm">("browse")
	const [vaultContextFolderId, setVaultContextFolderId] = useState<string | null>(null)
	const [importFolderId, setImportFolderId] = useState<string | null>(null)

	useEffect(() => {
		if (!debugLogsEnabled) return
		console.log("[sessions][upload] MeetingDocumentUpload open-state", {
			meetingId,
			isOpen,
			ts: new Date().toISOString(),
		})
	}, [debugLogsEnabled, isOpen, meetingId])

	useEffect(() => {
		if (!isOpen) return
		setUploadSource("file")
		setVaultStep("browse")
		setVaultContextFolderId(null)
		setImportFolderId(null)
	}, [isOpen])

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

	const vaultListQuery = trpc.principalVault.list.useQuery(
		{ parentId: vaultContextFolderId },
		{
			enabled: isOpen && uploadSource === "vault" && vaultStep === "browse" && !!meetingId,
			staleTime: 30_000,
		}
	)

	const folderTreeQuery = trpc.principalVault.listFolderTreeFiles.useQuery(
		{ folderId: importFolderId ?? "" },
		{
			enabled:
				isOpen && uploadSource === "vault" && vaultStep === "confirm" && !!importFolderId && !!meetingId,
			staleTime: 15_000,
		}
	)

	const importVaultFolder = trpc.meetings.importVaultFolderToMeeting.useMutation({
		onSuccess: data => {
			toast.success(
				`Imported ${data.importedCount} document${data.importedCount === 1 ? "" : "s"} from “${data.folderName}”.`
			)
			if (data.skipped.length > 0) {
				const preview = data.skipped
					.slice(0, 3)
					.map(s => `${s.name}: ${s.reason}`)
					.join("; ")
				toast.message(`${data.skipped.length} file(s) skipped`, {
					description:
						data.skipped.length > 3 ? `${preview}…` : preview || "See server response for details.",
				})
			}
			toast.message("The notary can create DocOnChain projects from each document card when ready.")
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
			setNotarizationType("")
			setFees("")
			setFeesError(null)
			setVaultStep("browse")
			setVaultContextFolderId(null)
			setImportFolderId(null)
			setUploadSource("file")
			onClose()
			onSuccess?.()
		},
		onError: error => {
			toast.error(error.message || "Failed to import folder")
			setIsUploading(false)
		},
	})

	// tRPC mutation for uploading documents
	const uploadDocument = trpc.meetings.uploadDocument.useMutation({
		onSuccess: data => {
			toast.success("Document uploaded successfully!")
			if (data && typeof data === "object" && "docoChain" in data) {
				const doco = (
					data as {
						docoChain?: { projectCreated?: boolean; error?: string; pendingManual?: boolean }
					}
				).docoChain
				if (doco?.pendingManual) {
					toast.message("The notary can create the DocOnChain project from the document card when ready.")
				} else if (doco?.projectCreated === false && doco?.error) {
					toast.error("DocOnChain is temporarily unavailable", {
						description: doco.error,
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
		disabled: isUploading || importVaultFolder.isPending,
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

	const busy = isUploading || importVaultFolder.isPending

	const handleVaultContinue = () => {
		if (vaultContextFolderId === null) {
			toast.error("Open a folder first, then import every PDF inside it (including subfolders).")
			return
		}
		setImportFolderId(vaultContextFolderId)
		setVaultStep("confirm")
	}

	const handleVaultImport = () => {
		if (!importFolderId) return

		if (!notarizationType) {
			toast.error("Please select a notarization type")
			return
		}

		const feesTrimmed = fees.trim()
		if (feesTrimmed === "") {
			const msg =
				"Please enter the notarization fee in PHP. It is required for the notarial book entry."
			setFeesError(msg)
			toast.error(msg)
			return
		}

		const feesNum = Number.parseFloat(feesTrimmed.replace(/,/g, ""))
		if (!Number.isFinite(feesNum) || feesNum < 0) {
			const msg = "Fees must be a valid non-negative number."
			setFeesError(msg)
			toast.error(msg)
			return
		}

		if (feesNum <= 0) {
			const msg =
				"Enter a fee greater than zero (PHP). If your profile has no default price for this act, type the amount here."
			setFeesError(msg)
			toast.error(msg)
			return
		}

		setFeesError(null)

		if (onUploadStart) {
			onUploadStart(window.innerWidth / 2, window.innerHeight / 2)
		}

		importVaultFolder.mutate({
			meetingId,
			folderId: importFolderId,
			notarizationType,
			description: description.trim() || undefined,
			fees: feesNum,
		})
	}

	const handleClose = () => {
		if (busy) return
		setIsUploading(false)
		setSelectedFile(null)
		setDocumentName("")
		setDescription("")
		setNotarizationType("")
		setFees("")
		setFeesError(null)
		setUploadSource("file")
		setVaultStep("browse")
		setVaultContextFolderId(null)
		setImportFolderId(null)
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
		if (!open && !busy) {
			setIsUploading(false)
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
			setNotarizationType("")
			setFees("")
			setFeesError(null)
			setUploadSource("file")
			setVaultStep("browse")
			setVaultContextFolderId(null)
			setImportFolderId(null)
			onClose()
		} else if (!open) {
			onClose()
		}
	}

	const maxMeetingBytes = 10 * 1024 * 1024
	const treeFiles = folderTreeQuery.data?.files ?? []
	const importablePdfCount = treeFiles.filter(
		f =>
			(f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) &&
			f.size > 0 &&
			f.size <= maxMeetingBytes
	).length
	const maxFolderImport = 40
	const tooManyPdfs = importablePdfCount > maxFolderImport

	const vaultAncestors = vaultListQuery.data?.ancestors ?? []

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-lg lg:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Upload className="size-5" />
						Add documents to session
					</DialogTitle>
					<DialogDescription>
						Upload a PDF from your device or import every PDF from a folder in My files (same
						notarization details apply to each imported file).
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={uploadSource}
					onValueChange={v => {
						const next = v as "file" | "vault"
						setUploadSource(next)
						if (next === "file") {
							setVaultStep("browse")
							setImportFolderId(null)
						}
					}}
					className="gap-3"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="file" disabled={busy}>
							Upload file
						</TabsTrigger>
						<TabsTrigger value="vault" disabled={busy}>
							My files folder
						</TabsTrigger>
					</TabsList>

					<TabsContent value="file" className="mt-0 space-y-4">
						{!selectedFile ? (
							<div
								{...getRootProps()}
								className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-6 ${
									isDragActive
										? "border-primary bg-primary/10"
										: "hover:border-primary border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
								} ${busy ? "cursor-not-allowed opacity-50" : ""}`}
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
										disabled={busy}
										className="text-gray-400 hover:text-red-500"
									>
										<X className="size-4" />
									</Button>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="document-name">Document Name</Label>
								<Input
									id="document-name"
									value={documentName}
									onChange={e => setDocumentName(e.target.value)}
									placeholder="Enter document name"
									disabled={busy || !selectedFile}
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
									disabled={busy || !selectedFile}
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
									disabled={busy || !selectedFile}
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
									disabled={busy || !selectedFile}
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
					</TabsContent>

					<TabsContent value="vault" className="mt-0 space-y-4">
						{vaultStep === "browse" ? (
							<>
								<div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
									<button
										type="button"
										className="hover:text-foreground rounded px-1 underline-offset-2 hover:underline"
										onClick={() => setVaultContextFolderId(null)}
										disabled={busy}
									>
										My files
									</button>
									{vaultAncestors.map(a => (
										<span key={a.id} className="inline-flex items-center gap-1">
											<ChevronRight className="size-3 opacity-60" />
											<button
												type="button"
												className="hover:text-foreground rounded px-1 underline-offset-2 hover:underline"
												onClick={() => setVaultContextFolderId(a.id)}
												disabled={busy}
											>
												{a.name}
											</button>
										</span>
									))}
								</div>

								<div className="border-border max-h-52 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
									{vaultListQuery.isLoading ? (
										<p className="text-muted-foreground text-xs">Loading…</p>
									) : vaultListQuery.error ? (
										<p className="text-destructive text-xs">{vaultListQuery.error.message}</p>
									) : (
										<>
											{vaultListQuery.data?.folders.map(f => (
												<button
													key={f.id}
													type="button"
													className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left"
													onClick={() => setVaultContextFolderId(f.id)}
													disabled={busy}
												>
													<Folder className="text-primary size-4 shrink-0" />
													<span className="truncate font-medium">{f.name}</span>
													<ChevronRight className="text-muted-foreground ml-auto size-4 shrink-0" />
												</button>
											))}
											{vaultListQuery.data?.files?.map(file => {
												const isPdf =
													file.mimeType === "application/pdf" ||
													file.name.toLowerCase().endsWith(".pdf")
												const overLimit = file.size > maxMeetingBytes
												return (
													<div
														key={file.id}
														className="flex items-start gap-2 rounded-md px-2 py-2 text-left"
													>
														<FileText
															className={cn(
																"mt-0.5 size-4 shrink-0",
																isPdf && !overLimit
																	? "text-muted-foreground"
																	: "text-muted-foreground/60"
															)}
															aria-hidden
														/>
														<div className="min-w-0 flex-1">
															<p className="text-foreground truncate text-sm leading-tight font-medium">
																{file.name}
															</p>
															<p className="text-muted-foreground mt-0.5 text-[11px]">
																{formatVaultFileSize(file.size)}
																{!isPdf
																	? " · not PDF (skipped on import)"
																	: overLimit
																		? " · over 10MB (skipped)"
																		: " · will import"}
															</p>
														</div>
													</div>
												)
											})}
											{!vaultListQuery.data?.folders.length &&
											!vaultListQuery.data?.files?.length ? (
												<p className="text-muted-foreground text-xs">This folder is empty.</p>
											) : null}
										</>
									)}
								</div>

								<p className="text-muted-foreground text-xs">
									Use the breadcrumbs to go back. When you are inside the folder you want to import,
									press <span className="text-foreground font-medium">Continue</span> below — every
									PDF in that folder and its subfolders is added (max {maxFolderImport} files, 10MB
									each).
								</p>
							</>
						) : (
							<>
								<div className="space-y-1">
									<p className="text-sm font-medium">
										Folder: {folderTreeQuery.data?.folderName ?? "…"}
									</p>
									<p className="text-muted-foreground text-xs">
										{folderTreeQuery.isLoading
											? "Counting PDFs…"
											: `${importablePdfCount} PDF(s) ready to import (under 10MB).`}
									</p>
									{tooManyPdfs ? (
										<p className="text-destructive text-xs">
											This folder has more than {maxFolderImport} importable PDFs. Remove some files
											or split into smaller folders — then try again.
										</p>
									) : null}
								</div>

								<div className="border-border max-h-36 overflow-y-auto rounded-md border p-2 text-xs">
									{folderTreeQuery.isLoading ? (
										<p className="text-muted-foreground">Loading file list…</p>
									) : (
										<ul className="space-y-1">
											{treeFiles.map(f => {
												const isPdf =
													f.mimeType === "application/pdf" ||
													f.name.toLowerCase().endsWith(".pdf")
												const ok = isPdf && f.size > 0 && f.size <= maxMeetingBytes
												return (
													<li
														key={f.id}
														className={
															ok
																? "text-foreground"
																: "text-muted-foreground line-through opacity-70"
														}
													>
														{f.name}
														{!isPdf ? " (not PDF)" : f.size > maxMeetingBytes ? " (too large)" : ""}
													</li>
												)
											})}
										</ul>
									)}
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="vault-notarization-type">
											Notarization Type (all documents) <span className="text-red-500">*</span>
										</Label>
										<Select
											value={notarizationType}
											onValueChange={value =>
												setNotarizationType(
													value as
														| "ACKNOWLEDGMENT"
														| "AFFIRMATION"
														| "JURAT"
														| "SIGNATURE_WITNESSING"
												)
											}
											disabled={busy}
										>
											<SelectTrigger id="vault-notarization-type">
												<SelectValue placeholder="Select notarization type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACKNOWLEDGMENT">Acknowledgment</SelectItem>
												<SelectItem value="AFFIRMATION">Affirmation or Oath</SelectItem>
												<SelectItem value="JURAT">Jurat</SelectItem>
												<SelectItem value="SIGNATURE_WITNESSING">Signature Witnessing</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="vault-description">Description (Optional)</Label>
										<Textarea
											id="vault-description"
											value={description}
											onChange={e => setDescription(e.target.value)}
											placeholder="Shared note for every file (each document also records its filename)"
											rows={2}
											disabled={busy}
											className="resize-none"
										/>
									</div>

									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="vault-fees">
											Fees per document (PHP) <span className="text-red-500">*</span>
										</Label>
										<Input
											id="vault-fees"
											type="number"
											step="0.01"
											min={0}
											value={fees}
											onChange={e => {
												setFees(e.target.value)
												setFeesError(null)
											}}
											placeholder="0.00"
											disabled={busy}
											aria-invalid={feesError ? true : undefined}
											aria-describedby={feesError ? "vault-fees-error" : undefined}
										/>
										{feesError ? (
											<p id="vault-fees-error" className="text-destructive text-xs" role="alert">
												{feesError}
											</p>
										) : (
											<p className="text-muted-foreground text-xs">
												Same fee applied to each imported PDF for the notarial book.
											</p>
										)}
									</div>
								</div>
							</>
						)}
					</TabsContent>
				</Tabs>

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
					{uploadSource === "file" ? (
						<>
							<Button variant="outline" onClick={handleClose} disabled={busy}>
								Cancel
							</Button>
							<Button
								onClick={handleUpload}
								disabled={busy || !selectedFile || !documentName.trim() || !notarizationType}
							>
								{isUploading ? (
									<>
										<div className="mr-2 size-4 animate-spin rounded-full border-b-2 border-white"></div>
										Uploading…
									</>
								) : (
									<>
										<Upload className="mr-2 size-4" />
										Upload document
									</>
								)}
							</Button>
						</>
					) : vaultStep === "browse" ? (
						<>
							<Button variant="outline" onClick={handleClose} disabled={busy}>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleVaultContinue}
								disabled={busy || vaultContextFolderId === null}
							>
								Continue
							</Button>
						</>
					) : (
						<>
							<Button
								variant="outline"
								onClick={() => {
									setVaultStep("browse")
									setImportFolderId(null)
								}}
								disabled={busy}
							>
								Back
							</Button>
							<Button variant="outline" onClick={handleClose} disabled={busy}>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleVaultImport}
								disabled={
									busy ||
									!notarizationType ||
									importablePdfCount === 0 ||
									tooManyPdfs ||
									folderTreeQuery.isLoading
								}
							>
								{importVaultFolder.isPending ? (
									<>
										<div className="mr-2 size-4 animate-spin rounded-full border-b-2 border-white"></div>
										Importing…
									</>
								) : (
									<>
										<Upload className="mr-2 size-4" />
										Import {importablePdfCount || "…"} PDF
										{importablePdfCount === 1 ? "" : "s"}
									</>
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
