"use client"

import { FileText } from "lucide-react"

import { DocumentUploadDialog } from "./document-upload-dialog"

interface DocumentEmptyStateProps {
	envelopeId?: string
}

export function DocumentEmptyState({ envelopeId }: DocumentEmptyStateProps) {
	return (
		<div className="text-center">
			<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
				<FileText className="h-10 w-10 text-muted-foreground" />
			</div>
			<h3 className="mb-2 text-lg font-medium text-foreground">
				No documents yet
			</h3>
			<p className="mb-6 text-sm text-muted-foreground">
				Upload your first document to get started with this envelope.
			</p>
			{envelopeId && (
				<DocumentUploadDialog
					envelopeId={envelopeId}
					onSuccess={() => window.location.reload()}
				/>
			)}
		</div>
	)
}
