"use client"

import { CheckCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface MySignedEmptyStateProps {
	onViewAllDocuments?: () => void
}

export function MySignedEmptyState({
	onViewAllDocuments
}: MySignedEmptyStateProps) {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/50 p-8 text-center">
			<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20">
				<CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
			</div>
			<h3 className="mb-3 text-lg font-medium text-foreground">
				No signed documents yet
			</h3>
			<p className="mb-6 max-w-md text-sm text-muted-foreground">
				Documents you have signed will appear here. Once you sign your first
				document, you&apos;ll be able to track and manage all your signed
				documents.
			</p>
			{onViewAllDocuments && (
				<Button onClick={onViewAllDocuments} variant="outline">
					View All Documents
				</Button>
			)}
		</div>
	)
}
