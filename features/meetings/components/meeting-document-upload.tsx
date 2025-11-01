"use client"

import { useCallback, useState } from "react"
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
import { Textarea } from "@/core/components/ui/textarea"
import { trpc } from "@/services/trpc/client"

interface MeetingDocumentUploadProps {
	meetingId: string
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
}

export function MeetingDocumentUpload({
	meetingId,
	isOpen,
	onClose,
	onSuccess,
}: MeetingDocumentUploadProps) {
	const [documentName, setDocumentName] = useState("")
	const [description, setDescription] = useState("")
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isUploading, setIsUploading] = useState(false)

	// tRPC mutation for uploading documents
	const uploadDocument = trpc.meetings.uploadDocument.useMutation({
		onSuccess: () => {
			toast.success("Document uploaded successfully!")
			// Reset form
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
			onClose()
			onSuccess?.()
		},
		onError: (error) => {
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
		if (!selectedFile) {
			toast.error("Please select a file")
			return
		}

		if (!documentName.trim()) {
			toast.error("Please enter a document name")
			return
		}

		setIsUploading(true)

		try {
			// Convert file to base64
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

			// Upload document
			uploadDocument.mutate({
				meetingId,
				name: documentName.trim(),
				file: base64,
				mimeType: selectedFile.type,
				size: selectedFile.size,
				description: description.trim() || undefined,
			})
		} catch (error) {
			console.error("Upload error:", error)
			toast.error("Failed to upload document")
			setIsUploading(false)
		}
	}

	const handleClose = () => {
		if (isUploading) return
		setSelectedFile(null)
		setDocumentName("")
		setDescription("")
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Upload className="size-5" />
						Upload Document
					</DialogTitle>
					<DialogDescription>
						Upload a document to share with meeting participants
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* File Drop Zone */}
					{!selectedFile ? (
						<div
							{...getRootProps()}
							className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
								isDragActive
									? "border-primary bg-primary/10"
									: "border-gray-300 hover:border-primary hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
							} ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
						>
							<input {...getInputProps()} />
							<div className="flex flex-col items-center gap-4">
								<div className="rounded-full bg-primary/10 p-4">
									<FileText className="size-8 text-primary" />
								</div>
								{isDragActive ? (
									<div>
										<p className="text-lg font-medium text-primary">Drop your PDF here</p>
										<p className="text-sm text-gray-500">Release to upload the document</p>
									</div>
								) : (
									<div>
										<p className="text-lg font-medium text-gray-900 dark:text-gray-100">
											Drag & drop your PDF here
										</p>
										<p className="text-sm text-gray-500">or click to browse files</p>
										<p className="mt-2 text-xs text-gray-400">Maximum file size: 10MB</p>
									</div>
								)}
							</div>
						</div>
					) : (
						/* Selected File Display */
						<div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
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

					{/* Document Details Form */}
					{selectedFile && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="document-name">Document Name</Label>
								<Input
									id="document-name"
									value={documentName}
									onChange={e => setDocumentName(e.target.value)}
									placeholder="Enter document name"
									disabled={isUploading}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description (Optional)</Label>
								<Textarea
									id="description"
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder="Enter a brief description of the document"
									rows={3}
									disabled={isUploading}
								/>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isUploading}>
						Cancel
					</Button>
					<Button onClick={handleUpload} disabled={isUploading || !selectedFile || !documentName.trim()}>
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

