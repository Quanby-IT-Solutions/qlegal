"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

interface DocumentUploadDialogProps {
	envelopeId: string
	onSuccess?: () => void
}

export function DocumentUploadDialog({
	envelopeId,
	onSuccess
}: DocumentUploadDialogProps) {
	const [files, setFiles] = useState<File[]>([])
	const [uploading, setUploading] = useState(false)
	const [uploadStatus, setUploadStatus] = useState("")
	const [isOpen, setIsOpen] = useState(false)

	// Mock tRPC calls for now
	const { refetch: refetchDocuments } =
		trpc.envelopeLite.getMyEnvelopes.useQuery(
			undefined,
			{ enabled: false }
		)

	const createDocuments = trpc.envelopeLite.createEnvelope.useMutation({
		onSuccess: async () => {
			await refetchDocuments()
			setFiles([])
			setUploadStatus("Documents uploaded successfully!")
			toast.success("Documents uploaded successfully!")
			setIsOpen(false)
			onSuccess?.()
		},
		onError: (error) => {
			console.error("Document creation error:", error)
			setUploadStatus("Failed to upload documents. Please try again.")
			toast.error("Failed to upload documents. Please try again.")
		}
	})

	const handleFilesReady = (selectedFiles: File[]) => {
		setFiles(selectedFiles)
		setUploadStatus("")
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(event.target.files ?? [])
		setFiles(selectedFiles)
		setUploadStatus("")
	}

	const handleUpload = async () => {
		if (files.length === 0) {return}

		setUploading(true)
		setUploadStatus("Uploading files...")

		try {
			// Mock upload process
			await new Promise(resolve => setTimeout(resolve, 2000))
			
			setUploadStatus("Creating document records...")
			
			// For now, just simulate success
			await new Promise(resolve => setTimeout(resolve, 1000))
			
			setUploadStatus("Documents uploaded successfully!")
			toast.success("Documents uploaded successfully!")
			setIsOpen(false)
			onSuccess?.()
		} catch (error) {
			console.error("Upload error:", error)
			setUploadStatus("Failed to upload files. Please try again.")
			toast.error("Failed to upload files. Please try again.")
		} finally {
			setUploading(false)
		}
	}

	const handleClose = () => {
		setIsOpen(false)
		setFiles([])
		setUploadStatus("")
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button className="px-3 text-sm" suppressHydrationWarning>
					<Upload className="mr-2 h-4 w-4" />
					Upload Documents
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto p-4 sm:p-6 lg:max-w-4xl">
				<DialogHeader className="space-y-2">
					<DialogTitle className="text-lg font-medium sm:text-xl">
						Upload Documents
					</DialogTitle>
					<DialogDescription className="text-sm sm:text-base">
						Select multiple PDF files to upload to this envelope.
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[60vh] space-y-4 overflow-y-auto">
					{/* Simple file input for now */}
					<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
						<input
							type="file"
							multiple
							accept=".pdf"
							onChange={handleFileSelect}
							className="hidden"
							id="file-upload"
						/>
						<label
							htmlFor="file-upload"
							className="cursor-pointer flex flex-col items-center gap-2"
						>
							<Upload className="h-8 w-8 text-muted-foreground" />
							<div className="text-sm font-medium">Choose PDF files</div>
							<div className="text-xs text-muted-foreground">
								Click to select files or drag and drop
							</div>
						</label>
					</div>

					{files.length > 0 && (
						<Card className="mt-4">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Files Selected</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex flex-wrap gap-2">
									{files.map((file, index) => (
										<Badge
											key={index}
											variant="secondary"
											className="max-w-[200px] truncate text-xs sm:max-w-[300px]"
										>
											{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
										</Badge>
									))}
								</div>

								<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
									<DialogClose asChild>
										<Button
											variant="outline"
											size="sm"
											onClick={handleClose}
											disabled={uploading}
											className="w-full sm:w-auto"
											suppressHydrationWarning
										>
											Cancel
										</Button>
									</DialogClose>
									<Button
										onClick={handleUpload}
										disabled={uploading || createDocuments.isPending}
										size="sm"
										className="w-full sm:w-auto"
										suppressHydrationWarning
									>
										{uploading || createDocuments.isPending
											? "Uploading..."
											: `Upload ${files.length} File(s)`}
									</Button>
								</div>

								{uploadStatus && (
									<p className="text-sm text-muted-foreground">
										{uploadStatus}
									</p>
								)}
							</CardContent>
						</Card>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
