"use client"

import { useCallback, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"

interface DocumentUploadProps {
	onDocumentUpload: (document: {
		name: string
		file: string // Base64
		mimeType: string
		size: number
		description?: string
	}) => void
	isUploading?: boolean
}

export function DocumentUpload({
	onDocumentUpload,
	isUploading = false
}: DocumentUploadProps) {
	const [documentName, setDocumentName] = useState("")
	const [description, setDescription] = useState("")
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0]
		if (!file) return

		// Validate file type
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
			"application/pdf": [".pdf"]
		},
		multiple: false,
		disabled: isUploading
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

			onDocumentUpload({
				name: documentName.trim(),
				file: base64,
				mimeType: selectedFile.type,
				size: selectedFile.size,
				description: description.trim() || undefined
			})

			// Reset form
			setSelectedFile(null)
			setDocumentName("")
			setDescription("")
		} catch (error) {
			console.error("Upload error:", error)
			toast.error("Failed to upload document")
		}
	}

	const handleRemoveFile = () => {
		setSelectedFile(null)
		setDocumentName("")
	}

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Upload className="h-5 w-5" />
					Upload Document
				</CardTitle>
				<CardDescription>
					Upload a PDF document to create a new signature envelope
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* File Drop Zone */}
				{!selectedFile ? (
					<div
						{...getRootProps()}
						className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
							isDragActive
								? "border-blue-500 bg-blue-50"
								: "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
						} ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
					>
						<input {...getInputProps()} />
						<div className="flex flex-col items-center gap-4">
							<div className="rounded-full bg-blue-100 p-4">
								<FileText className="h-8 w-8 text-blue-600" />
							</div>
							{isDragActive ? (
								<div>
									<p className="text-lg font-medium text-blue-600">
										Drop your PDF here
									</p>
									<p className="text-sm text-gray-500">
										Release to upload the document
									</p>
								</div>
							) : (
								<div>
									<p className="text-lg font-medium text-gray-900">
										Drag & drop your PDF here
									</p>
									<p className="text-sm text-gray-500">
										or click to browse files
									</p>
									<p className="mt-2 text-xs text-gray-400">
										Maximum file size: 10MB
									</p>
								</div>
							)}
						</div>
					</div>
				) : (
					/* Selected File Display */
					<div className="rounded-lg border border-gray-200 p-4">
						<div className="flex items-center gap-3">
							<div className="rounded bg-red-100 p-2">
								<FileText className="h-5 w-5 text-red-600" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-gray-900">
									{selectedFile.name}
								</p>
								<p className="text-xs text-gray-500">
									{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRemoveFile}
								disabled={isUploading}
								className="text-gray-400 hover:text-red-500"
							>
								<X className="h-4 w-4" />
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
								onChange={(e) => setDocumentName(e.target.value)}
								placeholder="Enter document name"
								disabled={isUploading}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description (Optional)</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter a brief description of the document"
								rows={3}
								disabled={isUploading}
							/>
						</div>

						<Button
							onClick={handleUpload}
							disabled={isUploading || !documentName.trim()}
							className="w-full"
						>
							{isUploading ? (
								<>
									<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
									Uploading...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload Document
								</>
							)}
						</Button>
					</div>
				)}

				{/* Help Text */}
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<h4 className="mb-2 text-sm font-medium text-blue-900">Next Steps</h4>
					<ul className="space-y-1 text-sm text-blue-800">
						<li>• Upload your PDF document</li>
						<li>• Add recipients who need to sign</li>
						<li>• Position signature fields and other form fields</li>
						<li>• Send the envelope for signing</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	)
}
