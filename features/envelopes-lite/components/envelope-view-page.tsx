"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"

import { trpc } from "@/services/trpc/client"

import { DocumentEmptyState } from "./document-empty-state"
import { DocumentListWithDisclosure } from "./document-list-with-disclosure"
import { DocumentLoadingSkeleton } from "./document-loading-skeleton"
import { DocumentUploadDialog } from "./document-upload-dialog"

type StatusFilter = "all" | "SIGNED" | "PENDING" | "REJECTED"

export function EnvelopeViewPage({ envelopeId }: { envelopeId: string }) {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

	const { data: envelope } = trpc.envelopeLite.getEnvelopeById.useQuery({
		envelopeId
	})

	const {
		data: documents,
		isPending,
		refetch: refetchDocuments
	} = trpc.envelopeLite.getEnvelopeDocuments.useQuery({ envelopeId })

	// Filter and search documents
	const filteredDocuments = useMemo(() => {
		if (!documents) return []

		return documents.filter((document) => {
			// Status filter
			if (statusFilter !== "all" && document.status !== statusFilter) {
				return false
			}

			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase()
				return (
					document.name.toLowerCase().includes(query) ||
					document.type.toLowerCase().includes(query)
				)
			}

			return true
		})
	}, [documents, statusFilter, searchQuery])

	const handleDocumentUploadSuccess = async () => {
		await refetchDocuments()
	}

	return (
		<div className="min-h-screen bg-muted dark:bg-background">
			{/* Header */}
			<div className="border-b bg-background backdrop-blur dark:bg-muted/60">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center gap-4">
						<div>
							<h1 className="text-2xl font-medium text-foreground">
								{envelope?.title ?? "Loading..."}
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								{envelope?.description ?? "No description"}
							</p>
						</div>
					</div>

					{/* Controls */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-1 items-center gap-4">
							{/* Search */}
							<div className="relative max-w-sm flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search documents..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>

						<div className="flex items-center gap-4">
							{/* Upload Button */}
							<DocumentUploadDialog
								envelopeId={envelopeId}
								onSuccess={handleDocumentUploadSuccess}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Documents */}
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{isPending && <DocumentLoadingSkeleton />}

				{!isPending && filteredDocuments.length === 0 && (
					<div className="py-12 text-center">
						{documents?.length === 0 ? (
							<DocumentEmptyState envelopeId={envelopeId} />
						) : (
							<div className="space-y-3">
								<div className="text-lg font-medium text-muted-foreground">
									No documents found
								</div>
								<p className="mx-auto max-w-md text-sm text-muted-foreground">
									{searchQuery || statusFilter !== "all"
										? "Try adjusting your search or filter criteria."
										: "Upload your first document to get started."}
								</p>
								{(searchQuery || statusFilter !== "all") && (
									<Button
										variant="outline"
										onClick={() => {
											setSearchQuery("")
											setStatusFilter("all")
										}}
									>
										Clear filters
									</Button>
								)}
							</div>
						)}
					</div>
				)}

				{/* Documents List */}
				{!isPending && filteredDocuments.length > 0 && (
					<DocumentListWithDisclosure
						documents={filteredDocuments}
						envelopeId={envelopeId}
					/>
				)}
			</div>

			{/* Documents Count */}
			<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				{/* Results count */}
				{!isPending && (
					<div className="text-sm text-muted-foreground">
						{filteredDocuments.length} of {documents?.length ?? 0} documents
						{statusFilter !== "all" &&
							` (filtered by ${statusFilter.toLowerCase()})`}
						{searchQuery && ` (matching "${searchQuery}")`}
					</div>
				)}
			</div>
		</div>
	)
}
