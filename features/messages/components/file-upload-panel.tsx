"use client"

import { format } from "date-fns"
import { Download, Eye, FileIcon, Trash2, Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useMessageFiles } from "@/features/messages/api/message-files.hooks"

import { MultiFileUploadDialog } from "./multi-file-upload-dialog"

interface FileUploadPanelProps {
	conversationId: string
}

export function FileUploadPanel({ conversationId }: FileUploadPanelProps) {
	const { getFiles, deleteFile } = useMessageFiles()
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
	const [uploadType, setUploadType] = useState<"general" | "principal" | "enp">("general")

	// Get files for each category
	const { data: generalFiles, isLoading: loadingGeneral } = getFiles(conversationId, "general")
	const { data: principalFiles, isLoading: loadingPrincipal } = getFiles(conversationId, "principal")
	const { data: enpFiles, isLoading: loadingEnp } = getFiles(conversationId, "enp")

	const handleDelete = async (fileId: string) => {
		try {
			await deleteFile.mutateAsync({ fileId })
			toast.success("File deleted successfully")
		} catch (error) {
			toast.error("Failed to delete file")
		}
	}

	const handleUploadClick = (type: "general" | "principal" | "enp") => {
		setUploadType(type)
		setUploadDialogOpen(true)
	}

	const handleDownload = async (filePath: string, fileName: string) => {
		try {
			const { getSupabaseBrowserClient } = await import("@/services/supabase/client")
			const supabase = getSupabaseBrowserClient()
			
			const { data, error } = await supabase.storage.from("documents").download(filePath)

			if (error) {
				throw error
			}

			// Create a download link
			const url = window.URL.createObjectURL(data)
			const a = document.createElement("a")
			a.href = url
			a.download = fileName
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			toast.success("File downloaded successfully")
		} catch (error) {
			console.error("Download error:", error)
			toast.error("Failed to download file")
		}
	}

	const handleView = async (filePath: string) => {
		try {
			const { getSupabaseBrowserClient } = await import("@/services/supabase/client")
			const supabase = getSupabaseBrowserClient()
			
			const { data, error } = await supabase.storage.from("documents").download(filePath)

			if (error) {
				throw error
			}

			// Create a blob URL and open in new tab
			const url = window.URL.createObjectURL(data)
			window.open(url, "_blank")
			
			// Clean up the URL after a delay
			setTimeout(() => {
				window.URL.revokeObjectURL(url)
			}, 100)

			toast.success("Opening file in new tab")
		} catch (error) {
			console.error("View error:", error)
			toast.error("Failed to open file")
		}
	}

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes"
		const k = 1024
		const sizes = ["Bytes", "KB", "MB", "GB"]
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
	}

	const FileItem = ({
		file,
	}: {
		file: {
			id: string
			fileName: string
			fileSize: number
			filePath: string
			fileUrl: string | null
			createdAt: Date
			uploadedBy: { name: string | null } | null
		}
	}) => (
		<Card className="p-3 transition-colors hover:bg-accent">
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<FileIcon className="size-5 text-primary" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{file.fileName}</p>
					<p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
					<p className="text-xs text-muted-foreground">
						{file.uploadedBy?.name} • {format(new Date(file.createdAt), "MMM d, h:mm a")}
					</p>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => void handleView(file.filePath)}
						title="View file"
					>
						<Eye className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => void handleDownload(file.filePath, file.fileName)}
						title="Download file"
					>
						<Download className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => void handleDelete(file.id)}
						disabled={deleteFile.isPending}
						title="Delete file"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>
		</Card>
	)

	const FileSection = ({
		title,
		files,
		isLoading,
		uploadType,
	}: {
		title: string
		files: any[] | undefined
		isLoading: boolean
		uploadType: "general" | "principal" | "enp"
	}) => (
		<div className="flex flex-col space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">{title}</h3>
				<Button
					variant="ghost"
					size="sm"
					className="size-8 p-0"
					onClick={() => handleUploadClick(uploadType)}
				>
					<Upload className="size-4" />
				</Button>
			</div>
			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : files && files.length > 0 ? (
				<div className="space-y-2">
					{files.map((file) => (
						<FileItem key={file.id} file={file} />
					))}
				</div>
			) : (
				<Card className="p-6 text-center">
					<FileIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
					<p className="text-xs text-muted-foreground">No files uploaded yet</p>
				</Card>
			)}
		</div>
	)

	return (
		<>
			<div className="flex h-screen w-80 flex-col border-l bg-background">
				{/* Header */}
				<div className="shrink-0 border-b p-4">
					<h2 className="text-lg font-semibold">Files</h2>
					<p className="text-xs text-muted-foreground">Manage conversation files</p>
				</div>

				{/* File Sections - Scrollable container */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="space-y-6">
						<FileSection
							title="Uploaded Files"
							files={generalFiles}
							isLoading={loadingGeneral}
							uploadType="general"
						/>
						<Separator />
						<FileSection
							title="PRINCIPAL Uploads"
							files={principalFiles}
							isLoading={loadingPrincipal}
							uploadType="principal"
						/>
						<Separator />
						<FileSection
							title="ENP Uploads"
							files={enpFiles}
							isLoading={loadingEnp}
							uploadType="enp"
						/>
					</div>
				</div>
			</div>

			<MultiFileUploadDialog
				conversationId={conversationId}
				uploadType={uploadType}
				open={uploadDialogOpen}
				onOpenChange={setUploadDialogOpen}
			/>
		</>
	)
}

