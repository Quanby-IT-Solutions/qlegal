"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ChevronDown, Download, Eye, FileText, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/core/components/ui/disclosure"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { formatFileSize, getDocumentStatus, getDocumentStatusConfig } from "../utils/status.utils"
import { DeleteDocumentDialog } from "./delete-document-dialog"
import { DocumentPreviewDialog } from "./document-preview-dialog"

type Document = RouterOutputs["envelopeLite"]["getEnvelopeDocuments"][number]

interface DocumentListWithDisclosureProps {
	documents: Document[]
	envelopeId: string
	onFilteredCountChange?: (count: number) => void
}

type FilterTab = "all" | "unsigned" | "signed"

export function DocumentListWithDisclosure({
	documents,
	envelopeId,
	onFilteredCountChange,
}: DocumentListWithDisclosureProps) {
	// Preview dialog state
	const [previewDocument, setPreviewDocument] = useState<{
		id: string
		name: string
	} | null>(null)

	// Active filter tab
	const [activeTab, setActiveTab] = useState<FilterTab>("all")

	const queryClient = useQueryClient()

	// Filter documents based on active tab
	const filteredDocuments = useMemo(() => {
		return documents.filter(document => {
			// Get document status using utility
			const documentStatus = getDocumentStatus(document.status, [])

			switch (activeTab) {
				case "all":
					return true
				case "unsigned":
					return documentStatus === "UNSIGNED"
				case "signed":
					return documentStatus === "SIGNED"
				default:
					return true
			}
		})
	}, [documents, activeTab])

	// Notify parent component of filtered count changes
	useEffect(() => {
		onFilteredCountChange?.(filteredDocuments.length)
	}, [filteredDocuments.length, onFilteredCountChange])

	// Delete document mutation
	const deleteDocument = trpc.envelopeLite.deleteDocument.useMutation({
		onSuccess: async () => {
			toast.success("Document deleted successfully!")
			// Invalidate and refetch envelope documents to update the list
			await queryClient.invalidateQueries({
				queryKey: [["envelopeLite", "getEnvelopeDocuments"]],
			})
			await queryClient.invalidateQueries({
				queryKey: [["envelopeLite", "getEnvelopeById"]],
			})
		},
		onError: _error => {
			toast.error("Failed to delete document. Please try again.")
		},
	})

	// Download certificate mutation
	const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null)
	const downloadCertificateQuery = trpc.signatureLite.downloadCertificate.useQuery(
		{ documentId: downloadingCertificateId ?? "" },
		{
			enabled: !!downloadingCertificateId,
			retry: false,
		}
	)

	// Handle certificate download
	useEffect(() => {
		if (downloadCertificateQuery.data && downloadingCertificateId) {
			try {
				// Convert base64 to blob
				const byteCharacters = atob(downloadCertificateQuery.data.base64)
				const byteNumbers = new Array(byteCharacters.length)
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i)
				}
				const byteArray = new Uint8Array(byteNumbers)
				const blob = new Blob([byteArray], { type: "application/pdf" })

				// Create download link
				const url = URL.createObjectURL(blob)
				const link = document.createElement("a")
				link.href = url
				link.download = downloadCertificateQuery.data.fileName
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				URL.revokeObjectURL(url)

				toast.success("Certificate downloaded successfully!")
			} catch (error) {
				console.error("Error downloading certificate:", error)
				toast.error("Failed to download certificate")
			} finally {
				setDownloadingCertificateId(null)
			}
		}
		if (downloadCertificateQuery.error && downloadingCertificateId) {
			toast.error(downloadCertificateQuery.error.message || "Failed to download certificate")
			setDownloadingCertificateId(null)
		}
	}, [downloadCertificateQuery.data, downloadCertificateQuery.error, downloadingCertificateId])

	const handleDownloadCertificate = (documentId: string) => {
		setDownloadingCertificateId(documentId)
	}

	const handleDeleteDocument = useCallback(
		async (documentId: string) => {
			deleteDocument.mutate({ documentId })
		},
		[deleteDocument]
	)

	return (
		<div className="space-y-4">
			{/* Filter Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={value => setActiveTab(value as FilterTab)}
				className="w-full"
			>
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="unsigned">Unsigned</TabsTrigger>
					<TabsTrigger value="signed">Signed</TabsTrigger>
				</TabsList>

				<TabsContent value={activeTab} className="mt-4">
					<div className="space-y-4">
						{filteredDocuments.map(document => {
							// Get document status using utility
							const documentStatus = getDocumentStatus(document.status, [])
							const statusConfig = getDocumentStatusConfig(documentStatus)

							return (
								<Card key={document.id} className="group dark:bg-muted/60 overflow-hidden">
									<CardContent className="p-0">
										<Disclosure>
											{/* Document Header */}
											<div className="flex items-center gap-4 p-4">
												<div className="bg-muted rounded-lg p-2">
													<FileText className="text-muted-foreground h-5 w-5" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="mb-1 flex items-center gap-2">
														<h3 className="truncate text-sm font-medium">{document.name}</h3>
														<div className="flex items-center gap-2">
															<Badge variant="secondary" className="text-xs">
																{document.type}
															</Badge>
															<Badge
																variant={statusConfig.variant}
																className={`text-xs ${statusConfig.className}`}
															>
																{statusConfig.label}
															</Badge>
														</div>
													</div>
													<p className="text-muted-foreground text-xs">
														{formatFileSize(document.size)} •{" "}
														{format(new Date(document.createdAt), "MMM d, yyyy 'at' h:mm a")}
													</p>
												</div>

												<div className="flex items-center gap-1">
													{/* Primary Actions Group */}
													<div className="flex items-center rounded-md border">
														{/* Preview Button */}
														<Tooltip>
															<TooltipTrigger>
																<Button
																	variant="ghost"
																	size="icon"
																	className="hover:bg-muted h-8 w-8 rounded-none border-r"
																	onClick={() =>
																		setPreviewDocument({
																			id: document.id,
																			name: document.name,
																		})
																	}
																>
																	<Eye className="h-4 w-4" />
																</Button>
															</TooltipTrigger>
															<TooltipContent>
																{documentStatus === "SIGNED"
																	? "Preview Signed Document"
																	: documentStatus === "PENDING"
																		? "Preview Pending Document"
																		: "Preview Unsigned Document"}
															</TooltipContent>
														</Tooltip>

														{/* Add Signers Button - Only show if document is not fully signed */}
														{documentStatus !== "SIGNED" && (
															<Tooltip>
																<TooltipTrigger>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="hover:bg-muted h-8 w-8 rounded-none border-r"
																		asChild
																	>
																		<a href={`/document/${document.id}/update-prepositioning`}>
																			<UserPlus className="h-4 w-4" />
																		</a>
																	</Button>
																</TooltipTrigger>
																<TooltipContent>Add Signers</TooltipContent>
															</Tooltip>
														)}

														{/* Disclosure trigger */}
														<Tooltip>
															<TooltipTrigger>
																<DisclosureTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="hover:bg-muted h-8 w-8 rounded-none border-r transition-transform data-[state=open]:rotate-180"
																	>
																		<ChevronDown className="h-4 w-4" />
																	</Button>
																</DisclosureTrigger>
															</TooltipTrigger>
															<TooltipContent>Show Details</TooltipContent>
														</Tooltip>

														{/* Delete Document Button */}
														<Tooltip>
															<TooltipTrigger>
																<DeleteDocumentDialog
																	documentName={document.name}
																	onConfirm={() => handleDeleteDocument(document.id)}
																	isDeleting={deleteDocument.isPending}
																	trigger={
																		<Button
																			variant="ghost"
																			size="icon"
																			className="hover:bg-muted h-8 w-8 rounded-none text-red-600 hover:text-red-700"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	}
																/>
															</TooltipTrigger>
															<TooltipContent>Delete Document</TooltipContent>
														</Tooltip>
													</div>
												</div>
											</div>

											{/* Disclosure Content */}
											<DisclosureContent>
												<div className="border-t p-4">
													<div className="space-y-4">
														{/* Document Details */}
														<div>
															<h4 className="text-foreground mb-3 text-sm font-medium">
																Document Details
															</h4>
															<div className="grid grid-cols-2 gap-4 text-sm">
																<div>
																	<span className="text-muted-foreground font-medium">
																		File Size:
																	</span>
																	<p>{formatFileSize(document.size)}</p>
																</div>
																<div>
																	<span className="text-muted-foreground font-medium">Type:</span>
																	<p>{document.type}</p>
																</div>
																<div>
																	<span className="text-muted-foreground font-medium">
																		Created:
																	</span>
																	<p>
																		{format(
																			new Date(document.createdAt),
																			"MMM d, yyyy 'at' h:mm a"
																		)}
																	</p>
																</div>
																<div>
																	<span className="text-muted-foreground font-medium">Status:</span>
																	<p>{statusConfig.label}</p>
																</div>
															</div>
														</div>

														{/* Document Actions */}
														<div className="border-t pt-3">
															<div className="flex items-center justify-between">
																<span className="text-muted-foreground text-sm font-medium">
																	Document Actions
																</span>
																<div className="flex gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => setPreviewDocument({ id: document.id, name: document.name })}
																	>
																		<Eye className="mr-2 h-3 w-3" />
																		Preview
																	</Button>
																	{/* Show download certificate button if envelope is completed and document has DocoChain project ID */}
																	{"envelopeStatus" in document &&
																		document.envelopeStatus === "COMPLETED" &&
																		document.docoChainProjectId && (
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() => handleDownloadCertificate(document.id)}
																				disabled={downloadingCertificateId === document.id}
																			>
																				{downloadingCertificateId === document.id ? (
																					<>
																						<div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
																						Downloading...
																					</>
																				) : (
																					<>
																						<Download className="mr-2 h-3 w-3" />
																						Certificate
																					</>
																				)}
																			</Button>
																		)}
																</div>
															</div>
														</div>
													</div>
												</div>
											</DisclosureContent>
										</Disclosure>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</TabsContent>
			</Tabs>

			{/* Document Preview Dialog */}
			{previewDocument && (
				<DocumentPreviewDialog
					isOpen={!!previewDocument}
					onClose={() => setPreviewDocument(null)}
					documentId={previewDocument.id}
					envelopeId={envelopeId}
					documentName={previewDocument.name}
				/>
			)}
		</div>
	)
}
