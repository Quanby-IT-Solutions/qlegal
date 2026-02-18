"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"

import {
	getDocumentSigningBadge,
	getMeetingStatusBadge,
} from "@/features/sessions/lib/meeting-badges"

interface NotarizationDetailsDialogProps {
	isOpen: boolean
	onClose: (open: boolean) => void
	meetingId: string | null
}

function DetailsSkeleton() {
	return (
		<div className="flex h-full flex-col">
			{/* Header skeleton */}
			<div className="flex items-center justify-between border-b p-3">
				<div className="flex items-center gap-3">
					<Skeleton className="size-8 rounded" />
					<div className="space-y-1.5">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
				<Skeleton className="h-6 w-16 rounded-full" />
			</div>
			{/* Document area skeleton */}
			<div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="flex items-center gap-2">
					<div
						className="border-muted border-t-primary size-5 animate-spin rounded-full border-2"
						aria-hidden
					/>
					<p className="text-muted-foreground text-sm">Loading document...</p>
				</div>
			</div>
		</div>
	)
}

function resolvePreviewUrl(doc: { previewUrl?: string | null }) {
	return { url: doc.previewUrl ?? null, isSigned: false }
}

function DocumentViewer({
	doc,
}: {
	doc: {
		name: string
		type?: string
		isFullySigned: boolean
		docoChainProjectId?: string | null
		previewUrl?: string | null
	}
}) {
	const docType = doc.type ?? ""
	const docName = doc.name ?? ""
	const { url: previewUrl } = resolvePreviewUrl(doc)

	if (!previewUrl) {
		return (
			<div className="flex h-full items-center justify-center p-8">
				<div className="text-center">
					<div className="bg-muted mb-4 rounded-lg p-3">
						<FileText className="text-muted-foreground mx-auto size-8" />
					</div>
					<p className="text-muted-foreground text-sm">No preview available for this document</p>
				</div>
			</div>
		)
	}

	const isImage = docType.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(docName)

	if (isImage) {
		return (
			<div className="flex h-full items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
				{/* eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase preview URL */}
				<img
					src={previewUrl}
					alt={docName}
					className="max-h-full max-w-full rounded object-contain"
				/>
			</div>
		)
	}

	return <iframe title={docName} src={previewUrl} className="size-full border-0" />
}

export function NotarizationDetailsDialog({
	isOpen,
	onClose,
	meetingId,
}: NotarizationDetailsDialogProps) {
	const [activeDocIndex, setActiveDocIndex] = useState(0)

	const { data: detailsData, isLoading } = trpc.meetings.getMeetingNotarizationDetails.useQuery(
		{ meetingId: meetingId ?? "" },
		{ enabled: isOpen && !!meetingId }
	)

	const documents = detailsData?.documents ?? []
	const activeDoc = documents[activeDocIndex]
	const hasMultipleDocs = documents.length > 1

	return (
		<Dialog
			open={isOpen}
			onOpenChange={open => {
				onClose(open)
				if (!open) setActiveDocIndex(0)
			}}
		>
			<DialogContent className="m-0 flex h-[90dvh] max-h-[92vh] w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-lg p-0 sm:h-[92vh] sm:w-[56vw] sm:max-w-none">
				<DialogHeader className="bg-background flex shrink-0 flex-col gap-2 border-b p-3 pr-10 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:p-4 sm:pr-12">
					<div className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
						<div className="bg-muted shrink-0 rounded-lg p-1.5 sm:p-2">
							<FileText className="text-muted-foreground size-4 sm:size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<DialogTitle className="text-foreground truncate text-base font-semibold sm:text-lg">
								{isLoading
									? "Loading..."
									: (activeDoc?.name ?? detailsData?.meeting.title ?? "Notarization Details")}
							</DialogTitle>
							<DialogDescription className="sr-only">
								{isLoading
									? "Loading notarization details"
									: `Document details${activeDoc ? `: ${activeDoc.name}` : ""}`}
							</DialogDescription>
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
						{!isLoading && detailsData && getMeetingStatusBadge(detailsData.meeting.status)}
						{!isLoading && activeDoc && getDocumentSigningBadge(activeDoc.isFullySigned)}
					</div>
				</DialogHeader>

				{/* Document navigation bar (only when multiple documents) */}
				{!isLoading && hasMultipleDocs && (
					<div className="bg-muted/50 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
						<div className="min-w-0 flex-1 overflow-x-auto">
							<div className="flex items-center gap-1.5 py-0.5 sm:gap-2">
								{documents.map((doc, idx) => (
									<Button
										key={doc.id}
										size="sm"
										variant={idx === activeDocIndex ? "default" : "ghost"}
										onClick={() => setActiveDocIndex(idx)}
										className="h-7 shrink-0 gap-1 px-2 text-xs sm:gap-1.5 sm:px-2.5"
									>
										<FileText className="size-3 shrink-0" />
										<span className="max-w-[80px] truncate sm:max-w-[120px]">{doc.name}</span>
										{doc.isFullySigned && (
											<Badge
												variant="outline"
												className="ml-0.5 h-4 shrink-0 border-emerald-600 px-1 text-[10px] text-emerald-700 sm:ml-1"
											>
												Signed
											</Badge>
										)}
									</Button>
								))}
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								disabled={activeDocIndex === 0}
								onClick={() => setActiveDocIndex(i => i - 1)}
								aria-label="Previous document"
							>
								<ChevronLeft className="size-4" />
							</Button>
							<span className="text-muted-foreground min-w-10 px-0.5 text-center text-xs sm:min-w-0 sm:px-1">
								{activeDocIndex + 1} / {documents.length}
							</span>
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								disabled={activeDocIndex === documents.length - 1}
								onClick={() => setActiveDocIndex(i => i + 1)}
								aria-label="Next document"
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				)}

				{/* Main content area - document fills the space */}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{isLoading && <DetailsSkeleton />}

					{!isLoading && !detailsData && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-muted mb-4 rounded-lg p-3">
									<FileText className="text-muted-foreground mx-auto size-8" />
								</div>
								<p className="text-muted-foreground text-sm">No details available</p>
							</div>
						</div>
					)}

					{!isLoading && detailsData && documents.length === 0 && (
						<div className="flex h-full items-center justify-center p-8">
							<div className="text-center">
								<div className="bg-muted mb-4 rounded-lg p-3">
									<FileText className="text-muted-foreground mx-auto size-8" />
								</div>
								<p className="text-muted-foreground text-sm">No documents uploaded</p>
							</div>
						</div>
					)}

					{!isLoading && activeDoc && (
						<div className="flex-1 overflow-hidden">
							<DocumentViewer key={activeDoc.id} doc={activeDoc} />
						</div>
					)}
				</div>

				{/* Compact footer with signer details (only when document has signers) */}
				{!isLoading && activeDoc && activeDoc.signerSummary.total > 0 && (
					<div className="bg-muted/30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs sm:px-4">
						<span className="text-muted-foreground min-w-0 truncate">
							Signers: {activeDoc.signerSummary.signed}/{activeDoc.signerSummary.total} completed
						</span>
						{activeDoc.fees !== undefined &&
							typeof activeDoc.fees === "number" &&
							!Number.isNaN(activeDoc.fees) &&
							activeDoc.isFullySigned && (
								<span className="text-muted-foreground shrink-0">
									Fees: {Number(activeDoc.fees).toFixed(2)}
								</span>
							)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
