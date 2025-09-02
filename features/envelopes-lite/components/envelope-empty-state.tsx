"use client"

import { FileTextIcon } from "lucide-react"

import { EnvelopeCreateDialog } from "./envelope-create-dialog"

export function EnvelopeEmptyState() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
					<FileTextIcon className="h-6 w-6 text-muted-foreground" />
				</div>
				<h3 className="mb-2 text-lg font-medium text-foreground">
					No envelopes found
				</h3>
				<p className="mb-6 text-sm text-muted-foreground">
					Get started by creating your first envelope
				</p>
				<EnvelopeCreateDialog />
			</div>
		</div>
	)
}
