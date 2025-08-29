"use client"

import { useEffect, useState } from "react"
import {
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	MoreVertical,
	User
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu"
import { Progress } from "@/core/components/ui/progress"
import { getInitials } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { DocumentPreviewDialog } from "@/features/envelopes-lite/components/document-preview-dialog"

// Types for the envelope and document structure
interface EnvelopeUser {
	id: string
	name: string | null
	email: string | null
}

interface DocumentRecipient {
	id: string
	role: string
	status: string
	userId: string | null
	user: EnvelopeUser | null
}

interface EnvelopeDocument {
	id: string
	name: string
	url: string
	recipients: DocumentRecipient[]
}

interface EnvelopeData {
	id: string
	title: string
	description: string | null
	status: string
	createdAt: Date | string
	createdBy: EnvelopeUser | null
	documents: EnvelopeDocument[]
}

interface SignedDocumentCardProps {
	envelope: EnvelopeData
	viewMode: "grid" | "list"
}

function getStatusColor(status: string) {
	switch (status.toLowerCase()) {
		case "completed":
			return "bg-green-500"
		case "published":
			return "bg-blue-500"
		case "draft":
			return "bg-gray-400"
		case "cancelled":
			return "bg-red-500"
		case "expired":
			return "bg-orange-500"
		default:
			return "bg-gray-400"
	}
}

function getSignatureProgress(doc: {
	recipients?: Array<{ status: string; role?: string }>
}) {
	if (!doc.recipients) return { signed: 0, total: 0, percent: 0 }
	const signersOnly = doc.recipients.filter((r) => r.role === "SIGNER")
	if (signersOnly.length === 0) return { signed: 0, total: 0, percent: 0 }

	const signedCount = signersOnly.filter((r) => r.status === "SIGNED").length
	const totalCount = signersOnly.length
	const percent =
		totalCount === 0 ? 0 : Math.round((signedCount / totalCount) * 100)

	return { signed: signedCount, total: totalCount, percent }
}

export function SignedDocumentCard({
	envelope,
	viewMode
}: SignedDocumentCardProps) {
	const { data: session } = useSession()

	// Modal state for document preview
	const [previewOpen, setPreviewOpen] = useState(false)
	const [previewDoc, setPreviewDoc] = useState<{
		documentId: string
		envelopeId: string
		documentName: string
	} | null>(null)

	// Create a lazy query for downloading
	const [downloadTrigger, setDownloadTrigger] = useState<{
		documentId: string
		envelopeId: string
	} | null>(null)

	const downloadQuery = trpc.envelopeLite.downloadDocument.useQuery(
		downloadTrigger ?? { documentId: "", envelopeId: "" },
		{
			enabled: !!downloadTrigger
		}
	)

	// Handle download result with useEffect
	useEffect(() => {
		if (downloadQuery.data && downloadTrigger) {
			const result = downloadQuery.data
			if (result?.downloadUrl) {
				// Use fetch to get the blob and force download
				fetch(result.downloadUrl)
					.then((response) => response.blob())
					.then((blob) => {
						const url = window.URL.createObjectURL(blob)
						const link = document.createElement("a")
						link.href = url
						link.download = result.name ?? "document.pdf"
						link.style.display = "none"

						document.body.appendChild(link)
						link.click()
						document.body.removeChild(link)

						// Clean up the blob URL
						window.URL.revokeObjectURL(url)

						toast.success(
							`${result.isSigned ? "Signed" : "Unsigned"} document downloaded successfully`
						)
					})
					.catch((error) => {
						console.error("Download failed:", error)
						toast.error("Failed to download document")
					})
			} else {
				toast.error("Failed to get download URL")
			}
			// Reset trigger
			setDownloadTrigger(null)
		}

		if (downloadQuery.error && downloadTrigger) {
			console.error("Download failed:", downloadQuery.error)
			toast.error("Failed to download document")
			setDownloadTrigger(null)
		}
	}, [downloadQuery.data, downloadQuery.error, downloadTrigger])

	const handleDownload = (documentId: string, envelopeId: string) => {
		setDownloadTrigger({ documentId, envelopeId })
	}

	if (viewMode === "list") {
		return (
			<Card className="group cursor-pointer overflow-hidden border border-border bg-background transition-all duration-200 hover:border-foreground/20 hover:shadow-sm dark:bg-muted/60">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						{/* Left side - Document info */}
						<div className="flex min-w-0 flex-1 items-center gap-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
								<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="truncate text-sm font-medium text-foreground">
									{envelope.title}
								</h3>
								<div className="mt-1 flex items-center gap-4">
									<p className="text-xs text-muted-foreground">
										From:{" "}
										{envelope.createdBy?.name ?? envelope.createdBy?.email}
									</p>
									<div className="flex items-center gap-1">
										<div
											className={`h-2 w-2 rounded-full ${getStatusColor(envelope.status)}`}
										/>
										<span className="text-xs capitalize text-muted-foreground">
											{envelope.status}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Right side - Meta info */}
						<div className="flex items-center gap-6 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<FileText className="h-3.5 w-3.5" />
								<span>{envelope.documents.length}</span>
							</div>
							<div className="flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								<span>{new Date(envelope.createdAt).toLocaleDateString()}</span>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 w-6 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
									>
										<MoreVertical className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => {
											const doc = envelope.documents[0]
											if (doc) {
												setPreviewDoc({
													documentId: doc.id,
													envelopeId: envelope.id,
													documentName: doc.name
												})
												setPreviewOpen(true)
											}
										}}
									>
										<Eye className="mr-2 h-4 w-4" />
										View
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											const doc = envelope.documents[0]
											if (doc) {
												handleDownload(doc.id, envelope.id)
											}
										}}
									>
										<Download className="mr-2 h-4 w-4" />
										Download
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardContent>
				{/* Document Preview Modal */}
				{previewDoc && (
					<DocumentPreviewDialog
						isOpen={previewOpen}
						onClose={() => setPreviewOpen(false)}
						documentId={previewDoc.documentId}
						envelopeId={previewDoc.envelopeId}
						documentName={previewDoc.documentName}
					/>
				)}
			</Card>
		)
	}

	return (
		<Card className="group cursor-pointer overflow-hidden border border-border bg-background transition-all duration-200 hover:border-foreground/20 hover:shadow-sm dark:bg-muted/60">
			<CardContent className="p-4">
				{/* Header */}
				<div className="mb-4 flex items-start justify-between">
					<div className="min-w-0 flex-1">
						<h3 className="mb-1 truncate text-sm font-medium text-foreground">
							{envelope.title}
						</h3>
						<p className="truncate text-xs text-muted-foreground">
							From: {envelope.createdBy?.name ?? envelope.createdBy?.email}
						</p>
						{envelope.description && (
							<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
								{envelope.description}
							</p>
						)}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
							>
								<MoreVertical className="h-3.5 w-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => {
									const doc = envelope.documents[0]
									if (doc) {
										setPreviewDoc({
											documentId: doc.id,
											envelopeId: envelope.id,
											documentName: doc.name
										})
										setPreviewOpen(true)
									}
								}}
							>
								<Eye className="mr-2 h-4 w-4" />
								View
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									const doc = envelope.documents[0]
									if (doc) {
										handleDownload(doc.id, envelope.id)
									}
								}}
							>
								<Download className="mr-2 h-4 w-4" />
								Download
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Status */}
				<div className="mb-4 flex items-center gap-2">
					<div
						className={`h-2 w-2 rounded-full ${getStatusColor(envelope.status)}`}
					/>
					<span className="text-xs capitalize text-muted-foreground">
						{envelope.status}
					</span>
					<Badge
						variant="outline"
						className="ml-auto border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/20 dark:text-green-400"
					>
						<CheckCircle className="mr-1 h-3 w-3" />
						Signed
					</Badge>
				</div>

				{/* Documents */}
				{envelope.documents && envelope.documents.length > 0 && (
					<div className="mb-4">
						<div className="space-y-2">
							{envelope.documents.slice(0, 2).map((doc) => {
								const progress = getSignatureProgress(doc)
								return (
									<div
										key={doc.id}
										className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
									>
										<div className="flex min-w-0 flex-1 items-center gap-2">
											<div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/20">
												<FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
											</div>
											<span className="truncate text-xs font-medium">
												{doc.name}
											</span>
										</div>
										{progress.total > 0 && (
											<div className="flex items-center gap-2">
												<Progress
													value={progress.percent}
													className="h-1 w-16"
												/>
												<span className="text-xs text-muted-foreground">
													{progress.signed}/{progress.total}
												</span>
											</div>
										)}
									</div>
								)
							})}
							{envelope.documents.length > 2 && (
								<p className="text-center text-xs text-muted-foreground">
									+{envelope.documents.length - 2} more documents
								</p>
							)}
						</div>
					</div>
				)}

				{/* Your Signing Status */}
				{envelope.documents?.some((doc) =>
					doc.recipients?.some(
						(recipient) =>
							recipient.role === "SIGNER" &&
							(recipient.userId === session?.user?.id ||
								recipient.user?.email === session?.user?.email)
					)
				) && (
					<div className="border-t border-border pt-3">
						<div className="mb-2 flex items-center gap-2">
							<User className="h-3.5 w-3.5 text-muted-foreground" />
							<span className="text-xs font-medium text-muted-foreground">
								Your Status
							</span>
						</div>
						{envelope.documents.map((doc) => {
							const myRecipient = doc.recipients?.find(
								(recipient) =>
									recipient.role === "SIGNER" &&
									(recipient.userId === session?.user?.id ||
										recipient.user?.email === session?.user?.email)
							)

							if (!myRecipient) return null

							return (
								<div key={doc.id} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarImage src={session?.user?.image ?? ""} />
											<AvatarFallback className="text-[10px]">
												{getInitials(session?.user?.name ?? "?")}
											</AvatarFallback>
										</Avatar>
										<span className="text-xs text-foreground">
											{session?.user?.name}
										</span>
									</div>
									<div className="flex items-center gap-1 text-green-600 dark:text-green-400">
										<CheckCircle className="h-3 w-3" />
										<span className="text-xs font-medium">Signed</span>
									</div>
								</div>
							)
						})}
					</div>
				)}

				{/* Footer Stats */}
				<div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<Clock className="h-3.5 w-3.5" />
						<span>{new Date(envelope.createdAt).toLocaleDateString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<FileText className="h-3.5 w-3.5" />
						<span>{envelope.documents.length}</span>
					</div>
				</div>
			</CardContent>

			{/* Document Preview Modal */}
			{previewDoc && (
				<DocumentPreviewDialog
					isOpen={previewOpen}
					onClose={() => setPreviewOpen(false)}
					documentId={previewDoc.documentId}
					envelopeId={previewDoc.envelopeId}
					documentName={previewDoc.documentName}
				/>
			)}
		</Card>
	)
}
