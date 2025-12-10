"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, CheckCircle2, Download, FileText, LayoutGrid, List, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"

import { trpc } from "@/services/trpc/client"

import { CertificatePreviewDialog } from "./certificate-preview-dialog"
import { DocumentPreviewDialog } from "./document-preview-dialog"

type ViewMode = "grid" | "list"

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes"
	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(d)
}

export function CompletedDocumentsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [viewMode, setViewMode] = useState<ViewMode>("grid")
	const [page, setPage] = useState(1)
	const [limit] = useState(20) // Fixed limit per page
	const [previewDocument, setPreviewDocument] = useState<{
		documentId: string
		envelopeId: string | null
		documentName: string
		projectUuid?: string
	} | null>(null)
	const [previewCertificate, setPreviewCertificate] = useState<{
		projectUuid: string
		certificateName: string
	} | null>(null)
	const [downloadingProjectUuid, setDownloadingProjectUuid] = useState<string | null>(null)

	const utils = trpc.useUtils()

	const {
		data: completedData,
		isPending,
		error,
		refetch,
		isRefetching,
	} = trpc.envelopeLite.getCompletedDocuments.useQuery(
		{ page, limit },
		{
			// Cache configuration for better performance
			staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh for 5 minutes
			gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 minutes
			refetchOnWindowFocus: false, // Don't refetch when window regains focus
			refetchOnMount: false, // Don't refetch on mount if data is fresh
			refetchOnReconnect: true, // Only refetch on reconnect
		}
	)

	const completedDocuments = completedData?.documents || []
	const total = completedData?.total || 0
	const hasMore = completedData?.hasMore || false

	// Handle manual refresh
	const handleRefresh = async () => {
		// Invalidate cache and refetch
		await utils.envelopeLite.getCompletedDocuments.invalidate()
		await refetch()
	}

	// Download signed document query
	const downloadDocumentQuery = trpc.envelopeLite.downloadSignedDocument.useQuery(
		{ projectUuid: downloadingProjectUuid || "" },
		{
			enabled: !!downloadingProjectUuid,
		}
	)

	// Handle download result
	useEffect(() => {
		if (downloadDocumentQuery.data && downloadingProjectUuid) {
			try {
				const result = downloadDocumentQuery.data
				if (result?.base64) {
					// Convert base64 to blob
					const byteCharacters = atob(result.base64)
					const byteNumbers = new Array(byteCharacters.length)
					for (let i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i)
					}
					const byteArray = new Uint8Array(byteNumbers)
					const blob = new Blob([byteArray], { type: "application/pdf" })

					// Create download link
					const url = window.URL.createObjectURL(blob)
					const link = document.createElement("a")
					link.href = url
					link.download = result.fileName || "signed-document.pdf"
					link.style.display = "none"

					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					// Clean up
					window.URL.revokeObjectURL(url)
					toast.success("Document downloaded successfully")
				} else {
					toast.error("Failed to get document data")
				}
			} catch (error) {
				console.error("Download failed:", error)
				toast.error("Failed to download document")
			} finally {
				setDownloadingProjectUuid(null)
			}
		}

		if (downloadDocumentQuery.error && downloadingProjectUuid) {
			console.error("Download failed:", downloadDocumentQuery.error)
			toast.error(downloadDocumentQuery.error.message || "Failed to download document")
			setDownloadingProjectUuid(null)
		}
	}, [downloadDocumentQuery.data, downloadDocumentQuery.error, downloadingProjectUuid])

	// Handle download button click
	const handleDownload = (projectUuid: string) => {
		if (!projectUuid) {
			toast.error("Project UUID is required")
			return
		}
		setDownloadingProjectUuid(projectUuid)
	}

	// Handle certificate view button click
	const handleViewCertificate = (projectUuid: string, documentName: string) => {
		if (!projectUuid) {
			toast.error("Project UUID is required")
			return
		}
		setPreviewCertificate({
			projectUuid,
			certificateName: `${documentName} - Certificate`,
		})
	}

	// Filter and search documents
	const filteredDocuments = useMemo(() => {
		if (!completedDocuments) {
			return []
		}

		return completedDocuments.filter(doc => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase()
				return (
					doc.name.toLowerCase().includes(query) ||
					doc.type.toLowerCase().includes(query) ||
					doc.envelope?.title.toLowerCase().includes(query) ||
					(doc.envelope?.description?.toLowerCase().includes(query) ?? false)
				)
			}

			return true
		})
	}, [completedDocuments, searchQuery])

	if (error) {
		return (
			<div className="bg-muted dark:bg-background min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<Card>
						<CardHeader>
							<CardTitle>Error</CardTitle>
							<CardDescription>Failed to load completed documents</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">{error.message}</p>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background dark:bg-muted/60 border-b backdrop-blur">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div>
						<h1 className="text-foreground text-2xl font-medium">Completed Documents</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							Documents that have been fully signed and completed
						</p>
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
								/>
							</div>

							{/* View Mode Toggle */}
							<ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value as ViewMode)}>
								<ToggleGroupItem value="grid" aria-label="Grid view">
									<LayoutGrid className="h-4 w-4" />
								</ToggleGroupItem>
								<ToggleGroupItem value="list" aria-label="List view">
									<List className="h-4 w-4" />
								</ToggleGroupItem>
							</ToggleGroup>

							{/* Refresh Button */}
							<Button
								variant="outline"
								size="icon"
								onClick={handleRefresh}
								disabled={isRefetching}
								title="Refresh documents"
							>
								<RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
							</Button>
						</div>

						{/* Results count */}
						{!isPending && total > 0 && (
							<div className="text-muted-foreground text-sm">
								Showing {completedDocuments.length} of {total} documents
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{isPending ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader>
									<div className="h-4 w-3/4 bg-muted rounded" />
									<div className="h-3 w-1/2 bg-muted rounded mt-2" />
								</CardHeader>
								<CardContent>
									<div className="h-20 bg-muted rounded" />
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredDocuments.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16">
							<CheckCircle2 className="text-muted-foreground h-12 w-12 mb-4" />
							<h3 className="text-foreground text-lg font-semibold mb-2">No completed documents</h3>
							<p className="text-muted-foreground text-sm text-center max-w-md">
								{searchQuery
									? "No documents match your search criteria."
									: "You don't have any completed documents yet. Documents will appear here once all signers have completed signing."}
							</p>
							{searchQuery && (
								<Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
									Clear search
								</Button>
							)}
						</CardContent>
					</Card>
				) : viewMode === "grid" ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredDocuments.map(doc => (
							<Card key={doc.id} className="hover:shadow-lg transition-shadow">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<CardTitle className="text-base truncate">{doc.name}</CardTitle>
											<CardDescription className="mt-1">
												{doc.envelope?.title || "No envelope"}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Status:</span>
										<Badge variant="default" className="bg-green-600 hover:bg-green-700">
											<CheckCircle2 className="mr-1 h-3 w-3" />
											Completed
										</Badge>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Completed:</span>
										<span className="font-medium">{formatDate(doc.updatedAt)}</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Size:</span>
										<span className="font-medium">{formatFileSize(doc.size)}</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Type:</span>
										<span className="font-medium">{doc.type}</span>
									</div>
									<div className="pt-2 border-t space-y-2">
										<Button
											variant="outline"
											className="w-full"
											onClick={() =>
												setPreviewDocument({
													documentId: doc.id,
													envelopeId: doc.envelopeId,
													documentName: doc.name,
													projectUuid: (doc as any).projectUuid || (doc as any).docoChainProjectId,
												})
											}
										>
											<FileText className="mr-2 h-4 w-4" />
											View Document
										</Button>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													const projectUuid = (doc as any).projectUuid || (doc as any).docoChainProjectId
													if (projectUuid) {
														handleDownload(projectUuid)
													}
												}}
												disabled={!((doc as any).projectUuid || (doc as any).docoChainProjectId) || downloadingProjectUuid === ((doc as any).projectUuid || (doc as any).docoChainProjectId)}
											>
												<Download className="mr-2 h-4 w-4" />
												{downloadingProjectUuid === ((doc as any).projectUuid || (doc as any).docoChainProjectId) ? "Downloading..." : "Download"}
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													const projectUuid = (doc as any).projectUuid || (doc as any).docoChainProjectId
													if (projectUuid) {
														handleViewCertificate(projectUuid, doc.name)
													}
												}}
												disabled={!((doc as any).projectUuid || (doc as any).docoChainProjectId)}
											>
												<Award className="mr-2 h-4 w-4" />
												Certificate
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="space-y-4">
						{filteredDocuments.map(doc => (
							<Card key={doc.id} className="hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-3">
												<FileText className="text-muted-foreground h-5 w-5 shrink-0" />
												<div className="flex-1 min-w-0">
													<h3 className="text-foreground font-medium truncate">{doc.name}</h3>
													<p className="text-muted-foreground text-sm mt-1">
														{doc.envelope?.title || "No envelope"}
													</p>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4 ml-4">
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Status</div>
												<Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
													<CheckCircle2 className="mr-1 h-3 w-3" />
													Completed
												</Badge>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Completed</div>
												<div className="font-medium mt-1">{formatDate(doc.updatedAt)}</div>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Size</div>
												<div className="font-medium mt-1">{formatFileSize(doc.size)}</div>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Type</div>
												<div className="font-medium mt-1">{doc.type}</div>
											</div>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setPreviewDocument({
															documentId: doc.id,
															envelopeId: doc.envelopeId,
															documentName: doc.name,
															projectUuid: (doc as any).projectUuid || (doc as any).docoChainProjectId,
														})
													}
												>
													<FileText className="mr-2 h-4 w-4" />
													View
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														const projectUuid = (doc as any).projectUuid || (doc as any).docoChainProjectId
														if (projectUuid) {
															handleDownload(projectUuid)
														}
													}}
													disabled={!((doc as any).projectUuid || (doc as any).docoChainProjectId) || downloadingProjectUuid === ((doc as any).projectUuid || (doc as any).docoChainProjectId)}
												>
													<Download className="mr-2 h-4 w-4" />
													{downloadingProjectUuid === ((doc as any).projectUuid || (doc as any).docoChainProjectId) ? "..." : "Download"}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														const projectUuid = (doc as any).projectUuid || (doc as any).docoChainProjectId
														if (projectUuid) {
															handleViewCertificate(projectUuid, doc.name)
														}
													}}
													disabled={!((doc as any).projectUuid || (doc as any).docoChainProjectId)}
												>
													<Award className="mr-2 h-4 w-4" />
													Certificate
												</Button>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Pagination Controls */}
				{!isPending && filteredDocuments.length > 0 && (
					<div className="mt-8 flex items-center justify-between border-t pt-6">
						<div className="text-muted-foreground text-sm">
							Page {page} • {total > 0 ? `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}` : "No documents"}
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page === 1 || isPending}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => p + 1)}
								disabled={!hasMore || isPending}
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Document Preview Dialog */}
			{previewDocument && (
				<DocumentPreviewDialog
					isOpen={!!previewDocument}
					onClose={() => setPreviewDocument(null)}
					documentId={previewDocument.documentId}
					envelopeId={previewDocument.envelopeId}
					documentName={previewDocument.documentName}
					projectUuid={previewDocument.projectUuid}
				/>
			)}

			{/* Certificate Preview Dialog */}
			{previewCertificate && (
				<CertificatePreviewDialog
					isOpen={!!previewCertificate}
					onClose={() => setPreviewCertificate(null)}
					projectUuid={previewCertificate.projectUuid}
					certificateName={previewCertificate.certificateName}
				/>
			)}
		</div>
	)
}

