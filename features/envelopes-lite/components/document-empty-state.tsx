"use client"

import { FileText } from "lucide-react"

import { DocumentUploadDialog } from "./document-upload-dialog"

interface DocumentEmptyStateProps {
	envelopeId?: string
}

export function DocumentEmptyState({ envelopeId }: DocumentEmptyStateProps) {
	return (
		<div className="text-center">
			<div className="bg-muted mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
				<FileText className="text-muted-foreground h-10 w-10" />
			</div>
			<h3 className="text-foreground mb-2 text-lg font-medium">No documents yet</h3>
			<p className="text-muted-foreground mb-6 text-sm">
				Upload your first document to get started with this envelope.
			</p>
			{envelopeId && (
				<DocumentUploadDialog envelopeId={envelopeId} onSuccess={() => window.location.reload()} />
			)}
		</div>
	)
}
