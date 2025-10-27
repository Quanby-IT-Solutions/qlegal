"use client"

import { FileTextIcon } from "lucide-react"

import { EnvelopeCreateDialog } from "./envelope-create-dialog"

export function EnvelopeEmptyState() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="text-center">
				<div className="border-border bg-background mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
					<FileTextIcon className="text-muted-foreground h-6 w-6" />
				</div>
				<h3 className="text-foreground mb-2 text-lg font-medium">No envelopes found</h3>
				<p className="text-muted-foreground mb-6 text-sm">
					Get started by creating your first envelope
				</p>
				<EnvelopeCreateDialog />
			</div>
		</div>
	)
}
