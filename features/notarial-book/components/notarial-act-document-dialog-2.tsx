"use client"

import { useState } from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"

interface NotarialActDocumentDialog2Props {
	isOpen: boolean
	onClose: () => void
	actId: string
	documentName: string
}

export function NotarialActDocumentDialog2({
	isOpen,
	onClose,
	actId,
	documentName,
}: NotarialActDocumentDialog2Props) {
	const {
		data: documentData,
		isPending,
		error,
	} = trpc.notarialBook.getDocumentUrl2.useQuery(
		{ actId },
		{
			enabled: isOpen && !!actId && actId.length > 0, // Only fetch when dialog is open and actId exists and is not empty
			retry: false, // Don't retry on error to avoid console spam
		}
	)

	const [isDownloading, setIsDownloading] = useState(false)
	const handleDownload = async () => {
		if (!documentData?.url) return
		setIsDownloading(true)
		try {
			const downloadUrl = documentData.url.includes("?")
				? `${documentData.url}&download=1`
				: `${documentData.url}?download=1`
			const res = await fetch(downloadUrl, { credentials: "include" })
			if (!res.ok) {
				const text = await res.text()
				throw new Error(text || `Download failed (${res.status})`)
			}
			const blob = await res.blob()
			const contentDisposition = res.headers.get("Content-Disposition")
			const fileNameMatch = contentDisposition?.match(/filename="?([^";\n]+)"?/)
			const fileName = fileNameMatch?.[1] ?? documentName
			const blobUrl = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = blobUrl
			a.download = fileName
			a.style.display = "none"
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(blobUrl)
		} catch (err) {
			toast.error(
				`Failed to download: ${err instanceof Error ? err.message : "Unknown error"}`
			)
		} finally {
			setIsDownloading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="!m-0 !flex !h-[85vh] !w-[90vw] !max-w-none flex-col !gap-0 overflow-hidden !rounded-lg !p-0"
				style={{ maxWidth: "90vw" }}
			>
				<DialogHeader className="bg-background flex shrink-0 flex-row items-center justify-between border-b p-4 pr-12">
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<div className="bg-muted shrink-0 rounded-lg p-2">
							<FileText className="text-muted-foreground h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1 text-left">
							<DialogTitle className="text-foreground truncate text-lg font-medium">
								{documentName}
							</DialogTitle>
							<p className="text-muted-foreground text-sm">
								Official notarized document with digital seal and certificate
							</p>
						</div>
					</div>
					{documentData?.url && !isPending && !error && (
						<div className="ml-4 shrink-0">
							<Button
								variant="outline"
								size="sm"
								disabled={isDownloading}
								onClick={() => void handleDownload()}
							>
								{isDownloading ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Download className="mr-2 size-4" />
								)}
								{isDownloading ? "Downloading..." : "Download"}
							</Button>
						</div>
					)}
				</DialogHeader>

				{/* Content Area - Fixed height to prevent layout shifts */}
				<div className="bg-muted/30 flex min-h-0 flex-1 flex-col overflow-hidden">
					{isPending && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
								<p className="text-muted-foreground text-sm">Loading document...</p>
							</div>
						</div>
					)}

					{error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-destructive/10 mb-4 rounded-lg p-3">
									<FileText className="text-destructive mx-auto h-8 w-8" />
								</div>
								<p className="text-destructive mb-2 font-medium">Failed to load document</p>
								<p className="text-muted-foreground mb-4 text-xs">
									{(() => {
										// Check if error is an Error instance (has message property)
										if (error instanceof Error) return error.message
										// Check if error.data has a code (HTTP status code)
										if (error.data?.code) {
											const codeStr = String(error.data.code)
											// Provide user-friendly error messages based on code
											if (codeStr.includes("NOT_FOUND") || error.data.code === "NOT_FOUND") {
												return "Document not found"
											}
											if (codeStr.includes("FORBIDDEN") || error.data.code === "FORBIDDEN") {
												return "Access denied"
											}
											if (
												codeStr.includes("BAD_GATEWAY") ||
												codeStr.includes("SERVICE_UNAVAILABLE")
											) {
												return "Service temporarily unavailable. Please try again later."
											}
											return `Error: ${codeStr}`
										}
										// Fallback to unknown error
										return "Unknown error"
									})()}
								</p>
								<div className="flex justify-center gap-2">
									<Button variant="outline" size="sm" onClick={onClose}>
										Close
									</Button>
									{documentData?.url && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => window.open(documentData.url, "_blank")}
										>
											<Download className="mr-2 h-4 w-4" />
											Open in New Tab
										</Button>
									)}
								</div>
							</div>
						</div>
					)}

					{documentData?.url && !isPending && !error && (
						<div className="flex-1 overflow-hidden">
							<SimplePdfViewer
								fileUrl={documentData.url}
								documentName={documentData.fileName ?? documentName}
							/>
						</div>
					)}

					{!documentData?.url && !isPending && !error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-muted mb-4 rounded-lg p-3">
									<FileText className="text-muted-foreground mx-auto h-8 w-8" />
								</div>
								<p className="text-muted-foreground text-sm">No document URL available</p>
								<p className="text-muted-foreground mt-2 text-xs">
									The document may not have been fully signed or may not exist in DocoChain.
								</p>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
