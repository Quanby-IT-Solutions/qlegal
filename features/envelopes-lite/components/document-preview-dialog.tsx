"use client"

import { FileText } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"

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
					<div className="flex h-full items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-muted-foreground mb-4">
								Document preview feature coming soon!
							</p>
							<p className="text-xs text-muted-foreground mb-4">
								Document ID: {documentId}
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={onClose}
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
