"use client"

import { Award } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "./simple-pdf-viewer"

interface CertificatePreviewDialogProps {
	isOpen: boolean
	onClose: () => void
	projectUuid: string
	certificateName: string
}

// Skeleton component for loading state
function CertificateSkeleton() {
	return (
		<div className="flex h-full flex-col">
			{/* PDF Viewer Toolbar Skeleton */}
			<div className="bg-background flex items-center justify-between border-b p-3">
				<div className="flex items-center space-x-3">
					<div className="bg-muted h-4 w-20 animate-pulse rounded" />
				</div>
				<div className="flex items-center space-x-2">
					<div className="bg-muted h-8 w-8 animate-pulse rounded" />
					<div className="bg-muted h-4 w-16 animate-pulse rounded" />
					<div className="bg-muted h-8 w-8 animate-pulse rounded" />
					<div className="bg-muted h-8 w-8 animate-pulse rounded" />
				</div>
			</div>

			{/* Certificate Content Area - Just loading indicator */}
			<div className="flex flex-1 items-center justify-center bg-gray-100">
				<div className="flex items-center space-x-2">
					<div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
					<p className="text-muted-foreground text-sm">Loading certificate...</p>
				</div>
			</div>
		</div>
	)
}

export function CertificatePreviewDialog({
	isOpen,
	onClose,
	projectUuid,
	certificateName,
}: CertificatePreviewDialogProps) {
	const {
		data: certificateData,
		isPending,
		error,
	} = trpc.envelopeLite.getCertificateForViewing.useQuery(
		{ projectUuid },
		{
			enabled: isOpen && !!projectUuid,
		}
	)

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="!flex !h-[96vh] !w-[96vw] !max-w-none flex-col overflow-hidden !p-0 !m-0 !rounded-lg !gap-0"
				style={{ maxWidth: "96vw" }}
			>
				<DialogHeader className="bg-background flex shrink-0 flex-row items-center justify-between border-b p-4">
					<div className="flex items-center gap-3">
						<div className="bg-muted rounded-lg p-2">
							<Award className="text-muted-foreground h-5 w-5" />
						</div>
						<div className="min-w-0 text-left">
							<DialogTitle className="text-foreground truncate text-lg font-medium">
								{certificateName}
							</DialogTitle>
							<p className="text-muted-foreground text-sm">Certificate of Completion</p>
						</div>
					</div>
				</DialogHeader>

				{/* Content Area - Fixed height to prevent layout shifts */}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{isPending && <CertificateSkeleton />}

					{error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-destructive/10 mb-4 rounded-lg p-3">
									<Award className="text-destructive mx-auto h-8 w-8" />
								</div>
								<p className="text-destructive mb-2 font-medium">Failed to load certificate</p>
								<p className="text-muted-foreground mb-4 text-xs">{error.message}</p>
								<Button variant="outline" size="sm" onClick={() => window.location.reload()}>
									Try Again
								</Button>
							</div>
						</div>
					)}

					{certificateData?.url && !isPending && !error && (
						<div className="flex-1 overflow-hidden">
							<SimplePdfViewer fileUrl={certificateData.url} documentName={certificateData.name} />
						</div>
					)}

					{!certificateData?.url && !isPending && !error && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-muted mb-4 rounded-lg p-3">
									<Award className="text-muted-foreground mx-auto h-8 w-8" />
								</div>
								<p className="text-muted-foreground text-sm">No certificate URL available</p>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

