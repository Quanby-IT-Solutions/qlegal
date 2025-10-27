"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"

import { TooltipProvider } from "@/core/components/tooltip"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"

import { trpc } from "@/services/trpc/client"

// import { DeleteEnvelopeDialog } from "./delete-envelope-dialog"
import { DocumentEmptyState } from "./document-empty-state"
import { DocumentListWithDisclosure } from "./document-list-with-disclosure"
import { DocumentLoadingSkeleton } from "./document-loading-skeleton"
import { DocumentUploadDialog } from "./document-upload-dialog"

type StatusFilter = "all" | "SIGNED" | "PENDING" | "REJECTED"

export function EnvelopeViewPage({ envelopeId }: { envelopeId: string }) {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const router = useRouter()

	const {
		data: envelope,
		error,
		isLoading: isLoadingEnvelope,
	} = trpc.envelopeLite.getEnvelopeById.useQuery({
		envelopeId,
	})

	// Redirect to envelopes list if envelope is not found (e.g., after deletion)
	useEffect(() => {
		if (
			error?.data?.code === "NOT_FOUND" ||
			error?.message?.includes("not found") ||
			error?.message?.includes("NOT_FOUND")
		) {
			router.push("/envelopes")
		}
	}, [error, router])

	// Get real documents from database
	const { data: documents = [], isLoading: isLoadingDocuments } =
		trpc.envelopeLite.getEnvelopeDocuments.useQuery({
			envelopeId,
		})

	// Filter and search documents
	const filteredDocuments = useMemo(() => {
		if (!documents) {
			return []
		}

		return documents.filter(document => {
			// Filter out documents with "_signed" in the name
			if (document.name.includes("_signed")) {
				return false
			}
			// Status filter (documents don't have status yet, so skip for now)
			// if (statusFilter !== "all" && document.status !== statusFilter) {
			// 	return false
			// }

			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase()
				return (
					document.name.toLowerCase().includes(query) || document.type.toLowerCase().includes(query)
				)
			}

			return true
		})
	}, [documents, searchQuery])

	const handleDocumentUploadSuccess = async () => {
		// Refresh documents when upload succeeds
		// TODO: Implement document refresh when real data is available
	}

	if (!envelopeId) {
		return (
			<div className="bg-muted dark:bg-background min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="py-12 text-center">
						<div className="text-muted-foreground mb-2 text-lg font-medium">
							Invalid Envelope ID
						</div>
						<p className="text-muted-foreground text-sm">The envelope ID is missing or invalid.</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background dark:bg-muted/60 border-b backdrop-blur">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/envelopes")}
							className="h-8 w-8 p-0"
							suppressHydrationWarning
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<h1 className="text-foreground text-2xl font-medium">
								{isLoadingEnvelope ? "Loading..." : (envelope?.title ?? "Untitled Envelope")}
							</h1>
							<p className="text-muted-foreground mt-1 text-sm">
								{envelope?.description ?? "No description"}
							</p>
						</div>
					</div>

					{/* Controls */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-1 items-center gap-4">
							{/* Search */}
							<div className="relative max-w-sm flex-1">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<Input
									placeholder="Search documents..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className="pl-9"
									suppressHydrationWarning
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
				{(isLoadingEnvelope || isLoadingDocuments) && <DocumentLoadingSkeleton />}

				{!isLoadingEnvelope && !isLoadingDocuments && filteredDocuments.length === 0 && (
					<div className="py-12 text-center">
						{(documents?.length ?? 0) === 0 ? (
							<DocumentEmptyState envelopeId={envelopeId} />
						) : (
							<div className="space-y-3">
								<div className="text-muted-foreground text-lg font-medium">No documents found</div>
								<p className="text-muted-foreground mx-auto max-w-md text-sm">
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
				{!isLoadingEnvelope && !isLoadingDocuments && filteredDocuments.length > 0 && (
					<TooltipProvider>
						<DocumentListWithDisclosure
							documents={filteredDocuments}
							envelopeId={envelopeId}
							onFilteredCountChange={_count => {
								// Optional: Update filtered count in parent component
							}}
						/>
					</TooltipProvider>
				)}
			</div>

			{/* Documents Count */}
			<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				{/* Results count */}
				{!isLoadingEnvelope && !isLoadingDocuments && (
					<div className="text-muted-foreground text-sm">
						{filteredDocuments.length} of{" "}
						{documents?.filter((doc: { name: string }) => !doc.name.includes("_signed")).length ??
							0}{" "}
						documents
						{statusFilter !== "all" && ` (filtered by ${statusFilter.toLowerCase()})`}
						{searchQuery && ` (matching "${searchQuery}")`}
					</div>
				)}
			</div>
		</div>
	)
}
