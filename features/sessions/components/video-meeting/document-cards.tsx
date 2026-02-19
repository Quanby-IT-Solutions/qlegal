"use client"

import React, { useCallback, useMemo, useState } from "react"
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileText,
	GripVertical,
	Lock,
	MoreVertical,
	RefreshCw,
	Unlock,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import type { PreGeneratedLinkEntry } from "../../lib/utils"
import { DocumentActions } from "./document-actions"
import { NotarizedDocumentMenuItem } from "./notarized-document-menu-item"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type MeetingDocument = {
	id: string
	name: string
	size: number
	docoChainProjectId: string | null
	status?: string | null
	notarizationType?: string | null
	fees?: number | null
	signerUserIds?: string[]
}

interface SigningStatus {
	isFullySigned: boolean
	signedCount: number
	totalSigners: number
	projectStatus?: string
	completedAt?: string | null
	signers: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
}

interface DocumentCardsProps {
	meetingId: string | undefined
	documents: MeetingDocument[]
	showDocuments: boolean
	onToggleShowDocuments: () => void
	isDocumentsFetching: boolean
	isRefreshingSigningStatus: boolean
	documentSigningStatus: Map<string, SigningStatus>
	meetingDetails:
		| {
				isDocumentOrderLocked?: boolean
				createdBy?: { id: string }
				participants?: Array<{
					userId: string
					user: {
						id: string
						name: string | null
						email: string | null
						role?: string | null
					} | null
				}>
		  }
		| null
		| undefined
	notarizationDetails:
		| {
				documents?: Array<{
					id: string
					signatureRequests?: Array<{
						signerId: string
						status: string
						signedAt: string | Date | null
					}>
				}>
		  }
		| null
		| undefined
	signingDocumentId: string | null
	isPlottingAction: boolean
	downloadingProjectUuid: string | null
	preGeneratedPlotLinks: Map<string, PreGeneratedLinkEntry>
	preGeneratedSignLinks: Map<string, PreGeneratedLinkEntry>
	userConfirmedPlottedDocumentIds: Set<string>
	docoChainTokenReady: boolean
	docoChainTokenLoading: boolean
	onSignClick: (
		projectUuid: string | null,
		email: string,
		documentId: string,
		isPlotting?: boolean
	) => Promise<void>
	onSignersChange: (documentId: string, userIds: string[]) => void
	onCreateProject: (documentId: string, meetingId: string) => void
	isCreatingProject: boolean
	onPreGeneratedLink: (
		documentId: string,
		link: string,
		projectUuid: string,
		kind: "plot" | "sign",
		cleanPlotUrl?: string
	) => void
	onViewNotarizedDocument: (projectUuid: string) => Promise<void>
	onRefresh: () => Promise<void>
	onToggleLock: (isLocked: boolean) => void
	isTogglingLock: boolean
	onUpdateDocumentOrder: (documentIds: string[]) => void
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const DocumentCards = React.memo(function DocumentCards({
	meetingId,
	documents,
	showDocuments,
	onToggleShowDocuments,
	isDocumentsFetching,
	isRefreshingSigningStatus,
	documentSigningStatus,
	meetingDetails,
	notarizationDetails,
	signingDocumentId,
	isPlottingAction,
	downloadingProjectUuid,
	preGeneratedPlotLinks,
	userConfirmedPlottedDocumentIds,
	docoChainTokenReady,
	docoChainTokenLoading,
	onSignClick,
	onSignersChange,
	onCreateProject,
	isCreatingProject,
	onPreGeneratedLink,
	onViewNotarizedDocument,
	onRefresh,
	onToggleLock,
	isTogglingLock,
	onUpdateDocumentOrder,
}: DocumentCardsProps) {
	const { data: session } = useSession()
	// A user can lock/unlock if they are the one who created this meeting,
	// NOT based on their role. Matches the original: meetingDetails.createdBy.id === session.user.id
	const isPrincipal = meetingDetails?.createdBy?.id === session?.user?.id

	const isLocked = meetingDetails?.isDocumentOrderLocked ?? false

	const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
	const [dragOverDocumentId, setDragOverDocumentId] = useState<string | null>(null)

	const handleDragStart = useCallback(
		(e: React.DragEvent, documentId: string) => {
			if (isLocked) {
				e.preventDefault()
				return
			}
			const target = e.target as HTMLElement
			if (target.closest("button") || target.closest("a") || target.closest('[role="button"]')) {
				e.preventDefault()
				return
			}
			setDraggedDocumentId(documentId)
			e.dataTransfer.effectAllowed = "move"
			e.dataTransfer.setData("text/plain", documentId)
		},
		[isLocked]
	)

	const handleDragEnter = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isLocked) {
				e.preventDefault()
				return
			}
			e.preventDefault()
			if (!draggedDocumentId || targetDocumentId === draggedDocumentId) return
			setDragOverDocumentId(targetDocumentId)
		},
		[draggedDocumentId, isLocked]
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
			setDragOverDocumentId(null)
		}
	}, [])

	const handleDragOver = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isLocked) {
				e.preventDefault()
				return
			}
			e.preventDefault()
			e.dataTransfer.dropEffect = "move"
			if (draggedDocumentId && targetDocumentId !== draggedDocumentId) {
				setDragOverDocumentId(targetDocumentId)
			}
		},
		[draggedDocumentId, isLocked]
	)

	const handleDrop = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isLocked) {
				e.preventDefault()
				setDraggedDocumentId(null)
				setDragOverDocumentId(null)
				return
			}
			e.preventDefault()
			setDragOverDocumentId(null)

			if (!draggedDocumentId || !documents) {
				setDraggedDocumentId(null)
				return
			}

			const sourceIndex = documents.findIndex(doc => doc.id === draggedDocumentId)
			const targetIndex = documents.findIndex(doc => doc.id === targetDocumentId)

			if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
				setDraggedDocumentId(null)
				return
			}

			const newOrder = [...documents]
			const removed = newOrder.splice(sourceIndex, 1)[0]
			if (!removed) {
				setDraggedDocumentId(null)
				return
			}
			newOrder.splice(targetIndex, 0, removed)
			onUpdateDocumentOrder(newOrder.map(doc => doc.id))
			setDraggedDocumentId(null)
		},
		[documents, draggedDocumentId, isLocked, onUpdateDocumentOrder]
	)

	const handleDragEnd = useCallback(() => {
		setDraggedDocumentId(null)
		setDragOverDocumentId(null)
	}, [])

	const notarizationDocs = useMemo(
		() =>
			Array.isArray((notarizationDetails as { documents?: unknown })?.documents)
				? (
						notarizationDetails as {
							documents: Array<{ id?: unknown; signatureRequests?: unknown }>
						}
					).documents
				: [],
		[notarizationDetails]
	)

	if (!documents || documents.length === 0) return null

	return (
		<div className="bg-card/50 border-t backdrop-blur-sm">
			{/* Panel Header */}
			<div className="flex items-center justify-between border-b px-3 py-2 md:px-4 lg:px-6">
				{(() => {
					return (
						<>
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold">Documents ({documents.length})</span>
								{isLocked && (
									<div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 dark:border-amber-700 dark:bg-amber-900/30">
										<Lock className="size-3 text-amber-700 dark:text-amber-400" />
										<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
											Order Locked
										</span>
									</div>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										if (isPrincipal && meetingId) {
											onToggleLock(!isLocked)
										}
									}}
									disabled={!isPrincipal || isTogglingLock}
									className={cn(
										"hover:bg-muted h-8 px-3 text-xs md:text-sm",
										isLocked &&
											"bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30",
										!isPrincipal && "cursor-not-allowed opacity-50"
									)}
									title={
										!isPrincipal
											? "Only the meeting creator (principal) can lock/unlock documents"
											: isLocked
												? "Unlock document order - allows reordering"
												: "Lock document order - enforces sequential signing"
									}
								>
									{isLocked ? (
										<>
											<Lock className="mr-1.5 size-3.5" />
											Locked
										</>
									) : (
										<>
											<Unlock className="mr-1.5 size-3.5" />
											Unlocked
										</>
									)}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={onRefresh}
									disabled={isDocumentsFetching || isRefreshingSigningStatus}
									className="hover:bg-muted size-8 px-0"
									title="Refresh documents and signing statuses"
								>
									<RefreshCw
										className={cn(
											"size-4",
											(isDocumentsFetching || isRefreshingSigningStatus) && "animate-spin"
										)}
									/>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={onToggleShowDocuments}
									className="hover:bg-muted h-8 px-3 text-xs md:text-sm"
								>
									{showDocuments ? "Hide" : "Show"}
								</Button>
							</div>
						</>
					)
				})()}
			</div>

			{/* Lock banner */}
			{isLocked && showDocuments && (
				<div className="border-b border-amber-200 bg-amber-50 px-3 py-2 md:px-4 lg:px-6 dark:border-amber-800 dark:bg-amber-900/10">
					<p className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
						<Lock className="size-3.5 shrink-0" />
						<span>
							Documents are locked in signing order. Each document must be signed before the next
							one can be started.
						</span>
					</p>
				</div>
			)}

			{showDocuments && (
				<div className="max-h-87.5 overflow-y-auto px-3 py-4 md:px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-3 transition-all duration-300 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
						{documents.map((doc, index) => {
							const isDragged = draggedDocumentId === doc.id
							const isDragOver = dragOverDocumentId === doc.id

							const previousDoc = index > 0 ? documents[index - 1] : null
							const previousInternalRequests = Array.isArray(
								notarizationDocs.find(d => d?.id === previousDoc?.id)?.signatureRequests
							)
								? (notarizationDocs.find(d => d?.id === previousDoc?.id)
										?.signatureRequests as Array<{ signerId?: unknown; status?: unknown }>)
								: []

							const previousSignerUserIds = Array.isArray(
								(previousDoc as { signerUserIds?: unknown })?.signerUserIds
							)
								? (previousDoc as { signerUserIds: string[] }).signerUserIds.filter(
										v => typeof v === "string" && v.trim()
									)
								: []

							const statusBySignerId = new Map<string, string>()
							for (const req of previousInternalRequests) {
								const id = typeof req?.signerId === "string" ? req.signerId.trim() : ""
								if (!id) continue
								statusBySignerId.set(
									id,
									typeof req?.status === "string" ? req.status.toUpperCase() : ""
								)
							}

							const previousIsInternallySigned =
								previousSignerUserIds.length > 0 &&
								previousSignerUserIds.every(id => {
									const s = statusBySignerId.get(id)
									return s === "SIGNED" || s === "COMPLETED"
								})

							const previousSigningStatus = previousDoc?.docoChainProjectId
								? documentSigningStatus.get(previousDoc.id)
								: undefined
							const previousIsExternallySigned =
								previousSigningStatus?.isFullySigned === true ||
								((previousSigningStatus?.totalSigners ?? 0) > 0 &&
									(previousSigningStatus?.signedCount ?? 0) ===
										(previousSigningStatus?.totalSigners ?? 0) &&
									(previousSigningStatus?.signedCount ?? 0) > 0) ||
								false

							const isPreviousDocumentSigned =
								!previousDoc || previousIsInternallySigned || previousIsExternallySigned

							const signingStatus = doc.docoChainProjectId
								? documentSigningStatus.get(doc.id)
								: undefined

							const isFullySigned =
								signingStatus?.isFullySigned === true ||
								((signingStatus?.totalSigners ?? 0) > 0 &&
									(signingStatus?.signedCount ?? 0) === (signingStatus?.totalSigners ?? 0) &&
									(signingStatus?.signedCount ?? 0) > 0) ||
								false

							const isDownloadingSigned =
								!!doc.docoChainProjectId && downloadingProjectUuid === doc.docoChainProjectId

							const docSignerUserIds = (doc as { signerUserIds?: string[] }).signerUserIds ?? []

							return (
								<Card
									key={doc.id}
									style={{
										opacity: isDragged && !isLocked ? 0.5 : 1,
										transform:
											isDragged && !isLocked
												? "scale(0.95)"
												: isDragOver && !isLocked
													? "scale(1.03)"
													: "scale(1)",
										transition:
											isDragged && !isLocked
												? "opacity 0.2s ease-out, transform 0.2s ease-out"
												: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
										zIndex: isDragged && !isLocked ? 50 : isDragOver && !isLocked ? 10 : 1,
									}}
									className={cn(
										"relative border-2 shadow-md hover:shadow-lg",
										isDragged
											? "cursor-grabbing shadow-2xl"
											: "hover:border-primary/50 hover:shadow-xl",
										isDragOver &&
											!isDragged &&
											!isLocked &&
											"border-primary bg-primary/5 border-2 shadow-xl",
										isLocked && "border-muted/50 opacity-90"
									)}
									onDragEnter={e => {
										if (!isLocked) handleDragEnter(e, doc.id)
									}}
									onDragLeave={handleDragLeave}
									onDragOver={e => {
										if (!isLocked) handleDragOver(e, doc.id)
									}}
									onDrop={e => {
										if (!isLocked) handleDrop(e, doc.id)
									}}
								>
									{/* Order indicator when locked */}
									{isLocked && (
										<div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 shadow-sm dark:border-amber-700 dark:bg-amber-900/40">
											<div className="flex size-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white dark:bg-amber-500">
												{index + 1}
											</div>
											<Lock className="size-3 text-amber-700 dark:text-amber-400" />
										</div>
									)}

									{/* Signing status + actions - top right corner */}
									{doc.docoChainProjectId && (
										<div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
											{signingStatus ? (
												isFullySigned ? (
													<div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
														<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
														<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
															Signed
														</span>
													</div>
												) : (signingStatus.signedCount ?? 0) > 0 ? (
													<div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
														<Clock className="size-3 text-yellow-600 dark:text-yellow-400" />
														<span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">
															{signingStatus.signedCount ?? 0}/{signingStatus.totalSigners ?? 0}
														</span>
													</div>
												) : (
													<div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
														<Clock className="size-3 text-gray-500 dark:text-gray-400" />
														<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
															Pending
														</span>
													</div>
												)
											) : null}

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
														title="More actions"
													>
														<MoreVertical className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
													<NotarizedDocumentMenuItem
														projectUuid={doc.docoChainProjectId}
														isOpening={isDownloadingSigned}
														onOpen={onViewNotarizedDocument}
													/>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									)}

									<CardContent className="p-4">
										<div className="mb-3 flex items-start gap-3">
											<div
												className={cn(
													"relative mt-1 shrink-0 transition-colors",
													isLocked
														? "cursor-not-allowed opacity-40"
														: "text-muted-foreground hover:text-primary cursor-move"
												)}
												draggable={!isLocked}
												onDragStart={e => handleDragStart(e, doc.id)}
												onDragEnd={handleDragEnd}
												title={
													isLocked
														? "Document order is locked - cannot reorder"
														: "Drag to reorder documents"
												}
											>
												<GripVertical
													className={cn("size-4", isLocked && "text-muted-foreground/30")}
												/>
											</div>
											<div className="bg-primary/10 shrink-0 rounded-lg p-2.5">
												<FileText className="text-primary size-5" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold" title={doc.name}>
													{doc.name}
												</p>
												<p className="text-muted-foreground mt-1 text-xs">
													{(doc.size / 1024).toFixed(1)} KB • PDF
												</p>
												{doc.notarizationType && (
													<p className="text-muted-foreground mt-1 text-xs font-medium">
														{(() => {
															switch (doc.notarizationType) {
																case "ACKNOWLEDGMENT":
																	return "Acknowledgment"
																case "AFFIRMATION":
																	return "Affirmation"
																case "JURAT":
																	return "Jurat"
																case "SIGNATURE_WITNESSING":
																	return "Signature Witnessing"
																default:
																	return doc.notarizationType
															}
														})()}
													</p>
												)}
												{(() => {
													const fees = doc.fees
													const showFees =
														isFullySigned &&
														fees !== null &&
														fees !== undefined &&
														typeof fees === "number" &&
														!Number.isNaN(fees)
													return showFees ? (
														<p className="text-muted-foreground mt-1 text-xs font-semibold">
															Fees: {fees.toFixed(2)}
														</p>
													) : null
												})()}
											</div>
										</div>

										<DocumentActions
											document={doc}
											onSignClick={onSignClick}
											onSignersChange={onSignersChange}
											isSigningPending={signingDocumentId === doc.id}
											isPlottingAction={signingDocumentId === doc.id ? isPlottingAction : false}
											isLocked={isLocked}
											isPreviousDocumentSigned={isPreviousDocumentSigned}
											documentIndex={index}
											signers={documentSigningStatus.get(doc.id)?.signers}
											signatureRequests={
												(notarizationDocs.find(d => d?.id === doc.id)?.signatureRequests ??
													[]) as Array<{
													id: string
													signerId: string
													status: string
													signedAt: string | Date | null
												}>
											}
											participants={meetingDetails?.participants ?? []}
											signerUserIds={docSignerUserIds}
											meetingId={meetingId}
											onCreateProject={onCreateProject}
											isCreatingProject={isCreatingProject}
											docoChainTokenReady={docoChainTokenReady}
											docoChainTokenLoading={docoChainTokenLoading}
											onPreGeneratedLink={onPreGeneratedLink}
											plotLinkReady={!!preGeneratedPlotLinks.get(doc.id)?.link}
											userConfirmedPlottedDocumentIds={userConfirmedPlottedDocumentIds}
										/>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
})
