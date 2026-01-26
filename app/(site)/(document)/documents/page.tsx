"use client"

import { useMemo, useState } from "react"
import { Calendar, Download, Eye, FileText, Search, User, Award, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"
import { trpc } from "@/services/trpc/client"

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	return format(d, "MMM dd, yyyy")
}

function getActTypeLabel(actType: string): string {
	switch (actType) {
		case "ACKNOWLEDGMENT":
			return "Acknowledgment"
		case "AFFIRMATION":
			return "Affirmation"
		case "JURAT":
			return "Jurat"
		case "SIGNATURE_WITNESSING":
			return "Signature Witnessing"
		default:
			return actType
	}
}

export default function DocumentsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [viewingActId, setViewingActId] = useState<string | null>(null)
	const [downloadingActId, setDownloadingActId] = useState<string | null>(null)

	const utils = trpc.useUtils()
	const { data: documents, isPending, error } = trpc.documents.getMyNotarizedDocuments.useQuery()

	// Get signed document data for viewing
	const viewingDocument = documents?.find(doc => doc.id === viewingActId)
	const { data: signedDocumentData, isPending: isFetchingSignedDocument } =
		trpc.documents.getSignedDocument.useQuery(
			{ actId: viewingActId! },
			{
				enabled: !!viewingActId,
				retry: false,
			}
		)

	// Filter documents based on search query
	const filteredDocuments = useMemo(() => {
		if (!documents) return []

		if (!searchQuery.trim()) return documents

		const query = searchQuery.toLowerCase()
		return documents.filter(doc => {
			return (
				doc.documentName.toLowerCase().includes(query) ||
				doc.enpName.toLowerCase().includes(query) ||
				(doc.certificateNumber?.toLowerCase().includes(query) ?? false) ||
				doc.actType.toLowerCase().includes(query)
			)
		})
	}, [documents, searchQuery])

	const handleView = (actId: string) => {
		setViewingActId(actId)
	}

	const handleDownload = async (actId: string, documentName: string) => {
		setDownloadingActId(actId)

		try {
			// Use tRPC utils to fetch signed document
			const response = await utils.documents.getSignedDocument.fetch({ actId })

			if (!response?.base64) {
				throw new Error("No document data available")
			}

			// Convert base64 to blob and download
			const binaryString = atob(response.base64)
			const bytes = new Uint8Array(binaryString.length)
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}
			const blob = new Blob([bytes], { type: "application/pdf" })
			const url = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = response.fileName || `${documentName}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			toast.success("Document downloaded successfully")
		} catch (error) {
			console.error("Error downloading document:", error)
			toast.error(error instanceof Error ? error.message : "Failed to download document")
		} finally {
			setDownloadingActId(null)
		}
	}

	if (error) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-destructive">
							Error loading documents: {error.message ?? "Unknown error"}
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="mb-2 text-3xl font-bold">My Notarized Documents</h1>
				<p className="text-muted-foreground">
					View all documents that have been notarized for you
				</p>
			</div>

			{/* Search */}
			<div className="mb-6">
				<div className="relative">
					<Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
					<Input
						type="text"
						placeholder="Search by document name, notary, certificate number..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Loading State */}
			{isPending && (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<Skeleton className="mb-4 h-6 w-3/4" />
								<Skeleton className="mb-2 h-4 w-1/2" />
								<Skeleton className="h-4 w-1/3" />
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Empty State */}
			{!isPending && filteredDocuments.length === 0 && (
				<Card>
					<CardContent className="py-12 text-center">
						<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
						<h3 className="mb-2 text-lg font-medium">No notarized documents found</h3>
						<p className="text-muted-foreground">
							{searchQuery
								? "Try adjusting your search query."
								: "You don't have any notarized documents yet."}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Documents List */}
			{!isPending && filteredDocuments.length > 0 && (
				<div className="space-y-4">
					{filteredDocuments.map(doc => {
						const hasSignedDocument = !!doc.docoChainProjectUuid
						const isDownloading = downloadingActId === doc.id

						return (
							<Card key={doc.id} className="transition-shadow hover:shadow-md">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="mb-2 flex items-center gap-2">
												<FileText className="text-muted-foreground size-5" />
												{doc.documentName}
											</CardTitle>
											<CardDescription className="flex flex-wrap items-center gap-4">
												<span className="flex items-center gap-1.5">
													<Calendar className="size-4" />
													{formatDate(doc.executedAt)}
												</span>
												<span className="flex items-center gap-1.5">
													<User className="size-4" />
													{doc.enpName}
												</span>
												{doc.enpRollNumber && (
													<span className="flex items-center gap-1.5">
														<Award className="size-4" />
														Roll #{doc.enpRollNumber}
													</span>
												)}
											</CardDescription>
										</div>
										<Badge variant="outline">{getActTypeLabel(doc.actType)}</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="space-y-2 text-sm">
											{doc.certificateNumber && (
												<div className="flex items-center gap-2">
													<span className="text-muted-foreground font-medium">
														Certificate Number:
													</span>
													<span className="font-mono">{doc.certificateNumber}</span>
												</div>
											)}
											<div className="text-muted-foreground">
												Notarized on {formatDate(doc.executedAt)}
											</div>
										</div>
										{/* View and Download Buttons */}
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleView(doc.id)}
												disabled={!hasSignedDocument}
												title={
													hasSignedDocument
														? "View signed document"
														: "Signed document not available"
												}
											>
												<Eye className="mr-2 size-4" />
												View
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDownload(doc.id, doc.documentName)}
												disabled={!hasSignedDocument || isDownloading}
												title={
													hasSignedDocument
														? "Download signed document"
														: "Signed document not available"
												}
											>
												{isDownloading ? (
													<>
														<Loader2 className="mr-2 size-4 animate-spin" />
														Downloading...
													</>
												) : (
													<>
														<Download className="mr-2 size-4" />
														Download
													</>
												)}
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}

			{/* Document View Dialog */}
			<Dialog open={!!viewingActId} onOpenChange={open => !open && setViewingActId(null)}>
				<DialogContent className="max-w-6xl">
					<DialogHeader>
						<DialogTitle>
							{viewingDocument?.documentName || "View Document"}
						</DialogTitle>
					</DialogHeader>
					<div className="flex min-h-[600px] flex-col">
						{isFetchingSignedDocument && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Loader2 className="mx-auto mb-4 size-8 animate-spin" />
									<p className="text-muted-foreground">Loading document...</p>
								</div>
							</div>
						)}
						{signedDocumentData?.documentUrl && !isFetchingSignedDocument && (
							<div className="flex-1 overflow-hidden">
								<SimplePdfViewer
									fileUrl={signedDocumentData.documentUrl}
									documentName={signedDocumentData.fileName}
								/>
							</div>
						)}
						{!signedDocumentData?.documentUrl && !isFetchingSignedDocument && viewingActId && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
									<p className="text-muted-foreground">
										Unable to load document. Please try downloading it instead.
									</p>
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
