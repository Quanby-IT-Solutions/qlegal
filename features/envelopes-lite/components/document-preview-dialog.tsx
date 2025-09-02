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
			<DialogContent className="h-[85vh] w-[90vw] max-w-7xl overflow-hidden p-0 sm:h-[90vh] sm:w-[95vw]">
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

				{/* Content */}
				<div className="flex h-full flex-col overflow-hidden">
					{isPending && (
						<div className="flex h-full items-center justify-center">
							<div className="flex flex-col items-center justify-center text-center">
								<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
								<p className="text-sm text-muted-foreground">
									Loading document...
								</p>
							</div>
						</div>
					)}

					{error && (
						<div className="flex h-full items-center justify-center">
							<div className="text-center">
								<p className="mb-4 text-sm text-destructive">
									Failed to load document
								</p>
								<p className="text-xs text-muted-foreground">{error.message}</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => window.location.reload()}
									className="mt-4"
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
						<div className="flex h-full items-center justify-center">
							<div className="text-center">
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
