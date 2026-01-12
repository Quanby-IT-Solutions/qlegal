"use client"

import { useEffect, useMemo, useState } from "react"
import {
	Award,
	CheckCircle2,
	Download,
	FileText,
	LayoutGrid,
	List,
	MoreVertical,
	RefreshCw,
	Search,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Input } from "@/core/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"

import { trpc } from "@/services/trpc/client"

import { CertificatePreviewDialog } from "./certificate-preview-dialog"
import { DocumentPreviewDialog } from "./document-preview-dialog"

type ViewMode = "grid" | "list"

// Extended document type to include DocoChain project properties
type CompletedDocument = {
	id: string
	name: string
	type: string
	size: number
	path: string
	status: string
	docoChainProjectId?: string
	createdAt: Date | string
	updatedAt: Date | string
	envelopeId: string | null
	envelope: null
	envelopeOwner: null
	projectId?: number
	projectUuid?: string
	projectCreatedAt?: string
	isVaultOnly?: boolean
}

// Helper function to safely get project UUID from document
function getProjectUuid(doc: unknown): string | undefined {
	const typedDoc = doc as CompletedDocument
	return typedDoc.projectUuid ?? typedDoc.docoChainProjectId
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes"
	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
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

	const completedDocuments = useMemo(
		() => completedData?.documents ?? [],
		[completedData?.documents]
	)
	const total = completedData?.total ?? 0
	const hasMore = completedData?.hasMore ?? false

	// Handle manual refresh
	const handleRefresh = async () => {
		// Invalidate cache and refetch
		await utils.envelopeLite.getCompletedDocuments.invalidate()
		await refetch()
	}

	// Download signed document query
	const downloadDocumentQuery = trpc.envelopeLite.downloadSignedDocument.useQuery(
		{ projectUuid: downloadingProjectUuid ?? "" },
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

				const envelope = doc.envelope as { title?: string; description?: string } | null | undefined

				const envelopeTitle = envelope?.title

				const envelopeDescription = envelope?.description
				return (
					doc.name.toLowerCase().includes(query) ||
					doc.type.toLowerCase().includes(query) ||
					Boolean(envelopeTitle?.toLowerCase().includes(query)) ||
					Boolean(envelopeDescription?.toLowerCase().includes(query))
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
							<p className="text-muted-foreground text-sm">{error.message}</p>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background border-b">
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
							<ToggleGroup
								type="single"
								value={viewMode}
								onValueChange={value => value && setViewMode(value as ViewMode)}
							>
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
									<div className="bg-muted h-4 w-3/4 rounded" />
									<div className="bg-muted mt-2 h-3 w-1/2 rounded" />
								</CardHeader>
								<CardContent>
									<div className="bg-muted h-20 rounded" />
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredDocuments.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16">
							<CheckCircle2 className="text-muted-foreground mb-4 h-12 w-12" />
							<h3 className="text-foreground mb-2 text-lg font-semibold">No completed documents</h3>
							<p className="text-muted-foreground max-w-md text-center text-sm">
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
							<Card key={doc.id} className="transition-shadow hover:shadow-lg">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="min-w-0 flex-1">
											<CardTitle className="truncate text-base">{doc.name}</CardTitle>
											<CardDescription className="mt-1">
												{}
												{(doc.envelope as { title?: string } | null | undefined)?.title ??
													"No envelope"}
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
									<div className="space-y-2 border-t pt-2">
										<Button
											variant="outline"
											className="w-full"
											onClick={() =>
												setPreviewDocument({
													documentId: doc.id,
													envelopeId: doc.envelopeId,
													documentName: doc.name,
													projectUuid: getProjectUuid(doc as CompletedDocument),
												})
											}
										>
											<FileText className="mr-2 h-4 w-4" />
											View Document
										</Button>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												className="flex-1"
												onClick={() => {
													const targetDocumentId = doc.id
													const targetEnvelopeId = doc.envelopeId as string | null
													if (targetDocumentId && targetEnvelopeId) {
														window.location.href = `/document/${targetDocumentId}/sign?envelopeId=${targetEnvelopeId}`
													}
												}}
											>
												Start Signing
											</Button>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="outline" size="icon">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => {
															const projectUuid = getProjectUuid(doc as CompletedDocument)
															if (projectUuid) {
																handleDownload(projectUuid)
															}
														}}
														disabled={
															!getProjectUuid(doc as CompletedDocument) ||
															downloadingProjectUuid === getProjectUuid(doc as CompletedDocument)
														}
													>
														<Download className="mr-2 h-4 w-4" />
														{downloadingProjectUuid === getProjectUuid(doc as CompletedDocument)
															? "Downloading..."
															: "Download Signed Document"}
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															const projectUuid = getProjectUuid(doc as CompletedDocument)
															if (projectUuid) {
																handleViewCertificate(projectUuid, doc.name)
															}
														}}
														disabled={!getProjectUuid(doc as CompletedDocument)}
													>
														<Award className="mr-2 h-4 w-4" />
														Download Certificate
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="space-y-4">
						{filteredDocuments.map(doc => (
							<Card key={doc.id} className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-3">
												<FileText className="text-muted-foreground h-5 w-5 shrink-0" />
												<div className="min-w-0 flex-1">
													<h3 className="text-foreground truncate font-medium">{doc.name}</h3>
													<p className="text-muted-foreground mt-1 text-sm">
														{}
														{(doc.envelope as unknown as { title?: string } | null | undefined)
															?.title ?? "No envelope"}
													</p>
												</div>
											</div>
										</div>
										<div className="ml-4 flex items-center gap-4">
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Status</div>
												<Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
													<CheckCircle2 className="mr-1 h-3 w-3" />
													Completed
												</Badge>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Completed</div>
												<div className="mt-1 font-medium">{formatDate(doc.updatedAt)}</div>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Size</div>
												<div className="mt-1 font-medium">{formatFileSize(doc.size)}</div>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Type</div>
												<div className="mt-1 font-medium">{doc.type}</div>
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
															projectUuid: getProjectUuid(doc as CompletedDocument),
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
														const projectUuid = getProjectUuid(doc as CompletedDocument)
														if (projectUuid) {
															handleDownload(projectUuid)
														}
													}}
													disabled={
														!getProjectUuid(doc as CompletedDocument) ||
														downloadingProjectUuid === getProjectUuid(doc as CompletedDocument)
													}
												>
													<Download className="mr-2 h-4 w-4" />
													{downloadingProjectUuid === getProjectUuid(doc as CompletedDocument)
														? "..."
														: "Download"}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														const projectUuid = getProjectUuid(doc as CompletedDocument)
														if (projectUuid) {
															handleViewCertificate(projectUuid, doc.name)
														}
													}}
													disabled={!getProjectUuid(doc as CompletedDocument)}
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
							Page {page} •{" "}
							{total > 0
								? `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`
								: "No documents"}
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
