"use client"

import { FileText } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "./simple-pdf-viewer"

interface DocumentPreviewDialogProps {
	isOpen: boolean
	onClose: () => void
	documentId: string
	envelopeId: string
	documentName: string
}

// Skeleton component for loading state
function DocumentSkeleton() {
	return (
		<div className="flex h-full flex-col">
			{/* PDF Viewer Toolbar Skeleton */}
			<div className="flex items-center justify-between border-b bg-background p-3">
				<div className="flex items-center space-x-3">
					<div className="h-4 w-20 animate-pulse rounded bg-muted" />
				</div>
				<div className="flex items-center space-x-2">
					<div className="h-8 w-8 animate-pulse rounded bg-muted" />
					<div className="h-4 w-16 animate-pulse rounded bg-muted" />
					<div className="h-8 w-8 animate-pulse rounded bg-muted" />
					<div className="h-8 w-8 animate-pulse rounded bg-muted" />
				</div>
			</div>

			{/* Document Content Area - Just loading indicator */}
			<div className="flex flex-1 items-center justify-center bg-gray-100">
				<div className="flex items-center space-x-2">
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
					<p className="text-sm text-muted-foreground">Loading document...</p>
				</div>
			</div>
		</div>
	)
}

export function DocumentPreviewDialog({
	isOpen,
	onClose,
	documentId,
	envelopeId,
	documentName
}: DocumentPreviewDialogProps) {
	const {
		data: documentData,
		isPending,
		error
	} = trpc.envelopeLite.getDocumentForViewing.useQuery({
		documentId,
		envelopeId
	})

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex h-[85vh] w-[90vw] max-w-7xl flex-col overflow-hidden p-0 sm:h-[90vh] sm:w-[95vw]">
				<DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b bg-background p-4">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-muted p-2">
							<FileText className="h-5 w-5 text-muted-foreground" />
						</div>
						<div className="min-w-0 text-left">
							<DialogTitle className="truncate text-lg font-medium text-foreground">
								{documentName}
							</DialogTitle>
							<p className="text-sm text-muted-foreground">Document Preview</p>
						</div>
					</div>
				</DialogHeader>

				{/* Content Area - Fixed height to prevent layout shifts */}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{isPending && <DocumentSkeleton />}

					{error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="mb-4 rounded-lg bg-destructive/10 p-3">
									<FileText className="mx-auto h-8 w-8 text-destructive" />
								</div>
								<p className="mb-2 font-medium text-destructive">
									Failed to load document
								</p>
								<p className="mb-4 text-xs text-muted-foreground">
									{error.message}
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => window.location.reload()}
								>
									Try Again
								</Button>
							</div>
						</div>
					)}

					{documentData?.url && !isPending && !error && (
						<div className="flex-1 overflow-hidden">
							<SimplePdfViewer
								fileUrl={documentData.url}
								documentName={documentData.name}
							/>
						</div>
					)}

					{!documentData?.url && !isPending && !error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="mb-4 rounded-lg bg-muted p-3">
									<FileText className="mx-auto h-8 w-8 text-muted-foreground" />
								</div>
								<p className="text-sm text-muted-foreground">
									No document URL available
								</p>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}