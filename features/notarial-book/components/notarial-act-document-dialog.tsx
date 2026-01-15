"use client"

import { Download, FileText, Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"

interface NotarialActDocumentDialogProps {
	isOpen: boolean
	onClose: () => void
	actId: string
	documentName: string
}

export function NotarialActDocumentDialog({
	isOpen,
	onClose,
	actId,
	documentName,
}: NotarialActDocumentDialogProps) {
	const {
		data: documentData,
		isPending,
		error,
	} = trpc.notarialBook.getDocumentUrl.useQuery(
		{ actId },
		{
			enabled: isOpen && !!actId, // Only fetch when dialog is open and actId exists
		}
	)

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="!m-0 !flex !h-[96vh] !w-[96vw] !max-w-none flex-col !gap-0 overflow-hidden !rounded-lg !p-0"
				style={{ maxWidth: "96vw" }}
			>
				<DialogHeader className="bg-background flex shrink-0 flex-row items-center justify-between border-b p-4">
					<div className="flex items-center gap-3">
						<div className="bg-muted rounded-lg p-2">
							<FileText className="text-muted-foreground h-5 w-5" />
						</div>
						<div className="min-w-0 text-left">
							<DialogTitle className="text-foreground truncate text-lg font-medium">
								{documentName}
							</DialogTitle>
							<p className="text-muted-foreground text-sm">Signed Document</p>
						</div>
					</div>
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
