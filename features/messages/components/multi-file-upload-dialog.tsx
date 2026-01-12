"use client"

import { useCallback, useState } from "react"
import { CheckCircle2, FileIcon, Loader2, Upload, X } from "lucide-react"
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
import { Progress } from "@/core/components/ui/progress"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { cn } from "@/core/lib/utils"

import { getSupabaseBrowserClient } from "@/services/supabase/client"

import { useMessageFiles } from "@/features/messages/api/message-files.hooks"

interface FileWithProgress {
	file: File
	progress: number
	status: "pending" | "uploading" | "success" | "error"
	error?: string
}

interface MultiFileUploadDialogProps {
	conversationId: string
	uploadType: "general" | "principal" | "enp"
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function MultiFileUploadDialog({
	conversationId,
	uploadType,
	open,
	onOpenChange,
}: MultiFileUploadDialogProps) {
	const [files, setFiles] = useState<FileWithProgress[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const { generateUploadUrl, saveFileMetadata } = useMessageFiles()

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const newFiles: FileWithProgress[] = acceptedFiles.map(file => ({
			file,
			progress: 0,
			status: "pending" as const,
		}))
		setFiles(prev => [...prev, ...newFiles])
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: true,
	})

	const removeFile = (index: number) => {
		setFiles(prev => prev.filter((_, i) => i !== index))
	}

	const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
		try {
			// Update status to uploading
			setFiles(prev =>
				prev.map((f, i) => (i === index ? { ...f, status: "uploading" as const } : f))
			)

			// Generate file path
			const pathData = await generateUploadUrl.mutateAsync({
				conversationId,
				fileName: fileWithProgress.file.name,
				fileType: fileWithProgress.file.type,
				uploadType,
			})

			// Upload file to Supabase storage
			const supabase = getSupabaseBrowserClient()
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from(pathData.bucket)
				.upload(pathData.path, fileWithProgress.file, {
					contentType: fileWithProgress.file.type,
					upsert: true,
				})

			if (uploadError) {
				throw new Error(uploadError.message)
			}

			// Update upload progress
			setFiles(prev => prev.map((f, i) => (i === index ? { ...f, progress: 100 } : f)))

			// Save metadata to database with the uploaded file path
			await saveFileMetadata.mutateAsync({
				conversationId,
				fileName: fileWithProgress.file.name,
				fileSize: fileWithProgress.file.size,
				fileType: fileWithProgress.file.type,
				filePath: uploadData.path,
				uploadType,
			})

			// Update status to success
			setFiles(prev => prev.map((f, i) => (i === index ? { ...f, status: "success" as const } : f)))
		} catch (error: any) {
			console.error("Upload error:", error)
			setFiles(prev =>
				prev.map((f, i) =>
					i === index
						? { ...f, status: "error" as const, error: error?.message || "Upload failed" }
						: f
				)
			)
			throw error
		}
	}

	const handleUpload = async () => {
		if (files.length === 0) return

		setIsUploading(true)
		try {
			// Upload all files sequentially
			for (let i = 0; i < files.length; i++) {
				const fileWithProgress = files[i]
				if (fileWithProgress && fileWithProgress.status === "pending") {
					await uploadFile(fileWithProgress, i)
				}
			}
			toast.success("All files uploaded successfully")
			setTimeout(() => {
				onOpenChange(false)
				setFiles([])
			}, 1000)
		} catch (error) {
			toast.error("Some files failed to upload")
		} finally {
			setIsUploading(false)
		}
	}

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes"
		const k = 1024
		const sizes = ["Bytes", "KB", "MB", "GB"]
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
	}

	const getUploadTypeLabel = () => {
		switch (uploadType) {
			case "general":
				return "Uploaded Files"
			case "principal":
				return "PRINCIPAL Uploads"
			case "enp":
				return "ENP Uploads"
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Upload Files to {getUploadTypeLabel()}</DialogTitle>
					<DialogDescription>
						Select multiple files to upload to this conversation
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Dropzone */}
					<div
						{...getRootProps()}
						className={cn(
							"flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
							isDragActive
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-primary/50"
						)}
					>
						<input {...getInputProps()} />
						<Upload className="text-muted-foreground mb-4 size-10" />
						<p className="text-sm font-medium">
							{isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
						</p>
						<p className="text-muted-foreground mt-1 text-xs">
							You can upload multiple files at once
						</p>
					</div>

					{/* File List */}
					{files.length > 0 && (
						<ScrollArea className="h-64 rounded-lg border">
							<div className="space-y-2 p-4">
								{files.map((fileWithProgress, index) => (
									<div key={index} className="flex items-center gap-3 rounded-lg border p-3">
										<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
											{fileWithProgress.status === "success" ? (
												<CheckCircle2 className="size-5 text-green-600" />
											) : fileWithProgress.status === "uploading" ? (
												<Loader2 className="text-primary size-5 animate-spin" />
											) : fileWithProgress.status === "error" ? (
												<X className="text-destructive size-5" />
											) : (
												<FileIcon className="text-primary size-5" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{fileWithProgress.file.name}</p>
											<p className="text-muted-foreground text-xs">
												{formatFileSize(fileWithProgress.file.size)}
											</p>
											{fileWithProgress.status === "uploading" && (
												<Progress value={fileWithProgress.progress} className="mt-2 h-1" />
											)}
											{fileWithProgress.status === "error" && (
												<p className="text-destructive text-xs">{fileWithProgress.error}</p>
											)}
										</div>
										{fileWithProgress.status === "pending" && (
											<Button
												variant="ghost"
												size="icon"
												className="size-8 shrink-0"
												onClick={() => removeFile(index)}
											>
												<X className="size-4" />
											</Button>
										)}
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
						Cancel
					</Button>
					<Button onClick={() => void handleUpload()} disabled={files.length === 0 || isUploading}>
						{isUploading ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Uploading...
							</>
						) : (
							`Upload ${files.length} file${files.length !== 1 ? "s" : ""}`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
