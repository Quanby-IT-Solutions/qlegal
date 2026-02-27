"use client"

import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"
import {
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	GripVertical,
	Lock,
	MoreVertical,
	RefreshCw,
	Unlock,
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { cn } from "@/core/lib/utils"

import {
	MEETING_LOCK_BADGE_LABEL,
	MEETING_LOCK_HELPER_TEXT,
	getDocumentReorderTitle,
	getMeetingLockToggleLabel,
} from "@/features/sessions/lib/meeting-lock-contract"

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
	onSignersChange: (
		documentId: string,
		userIds: string[],
		roles: Record<string, "principal" | "witness">
	) => void
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

export interface DocumentCardsHandle {
	getSidebarTarget: () => { x: number; y: number } | null
}

export const DocumentCards = React.memo(
	React.forwardRef<DocumentCardsHandle, DocumentCardsProps>(function DocumentCards(
		{
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
		}: DocumentCardsProps,
		ref: React.Ref<DocumentCardsHandle>
	) {
		const { data: session } = useSession()
		// Lock/unlock is gated on being the meeting creator, not on role.
		const isPrincipal = meetingDetails?.createdBy?.id === session?.user?.id
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		const lockToggleTitle: string = !isPrincipal
			? "Only the meeting creator can lock or unlock document changes"
			: getMeetingLockToggleLabel(Boolean(isLocked))
		const reorderTitle: string = getDocumentReorderTitle(Boolean(isLocked))

		const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
		const [dragOverDocumentId, setDragOverDocumentId] = useState<string | null>(null)
		const collapsedStripRef = useRef<HTMLButtonElement>(null)
		const drawerHeaderIconRef = useRef<HTMLDivElement>(null)

		// Expose getSidebarTarget imperatively for the flight animation
		useImperativeHandle(ref, () => ({
			getSidebarTarget: () => {
				const el =
					(showDocuments ? drawerHeaderIconRef.current : collapsedStripRef.current) ??
					drawerHeaderIconRef.current ??
					collapsedStripRef.current
				if (!el) return null
				const rect = el.getBoundingClientRect()
				return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
			},
		}))

		// ─── Drag-and-drop handlers ────────────────────────────────

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

		// ─── Notarization docs lookup ──────────────────────────────

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
		const totalFees = useMemo(
			() =>
				documents.reduce((sum, doc) => {
					const fees = doc.fees
					const hasValidFees =
						fees !== null &&
						fees !== undefined &&
						typeof fees === "number" &&
						!Number.isNaN(fees)
					return hasValidFees ? sum + fees : sum
				}, 0),
			[documents]
		)

		if (!documents || documents.length === 0) return null

		// ─── Collapsed: show a slim vertical tab on the right edge ─

		// ─── Collapsed strip (visible when panel is closed) ───
		const strip = !showDocuments ? (
			<button
				ref={collapsedStripRef}
				onClick={onToggleShowDocuments}
				className={cn(
					"group relative flex h-full w-12 shrink-0 flex-col items-center justify-start gap-2 border-l pt-3",
					"bg-card/60 hover:bg-card backdrop-blur-sm transition-colors",
					"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
				)}
				title={`Show documents panel (${documents.length} file${documents.length !== 1 ? "s" : ""})`}
				aria-label="Show documents panel"
			>
				{/* Chevron arrow at top */}
				<ChevronLeft className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors" />

				{/* All file icons stacked below, no limit */}
				<div className="flex w-full flex-col items-center gap-1 px-1">
					{documents.map((_, i) => (
						<div
							key={i}
							className={cn(
								"flex w-full items-center justify-center rounded-md p-1.5 transition-colors",
								i === 0
									? "bg-primary/15 group-hover:bg-primary/20"
									: "bg-muted/60 group-hover:bg-muted/80"
							)}
						>
							<FileText
								className={cn(
									"size-3.5 shrink-0 transition-colors",
									i === 0 ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
								)}
							/>
						</div>
					))}
				</div>

				{isLocked && <Lock className="mt-1 size-3 shrink-0 text-amber-500 dark:text-amber-400" />}
			</button>
		) : null

		// ─── Backdrop + drawer (always mounted when we have documents; animated open/close) ───
		return (
			<>
				{strip}

				{/* Backdrop — fades in/out */}
				<div
					className={cn(
						"fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200 ease-out",
						showDocuments ? "opacity-100" : "pointer-events-none opacity-0"
					)}
					onClick={onToggleShowDocuments}
					aria-hidden="true"
				/>

				{/* Drawer panel — slides in from right / out to right */}
				<div
					className={cn(
						"bg-card/95 fixed inset-y-0 right-0 z-50 flex w-72 shrink-0 flex-col border-l shadow-2xl backdrop-blur-md xl:w-80",
						"transition-transform duration-200 ease-out",
						showDocuments ? "translate-x-0" : "translate-x-full",
						showDocuments ? "pointer-events-auto" : "pointer-events-none"
					)}
				>
					{/* ── Header ─────────────────────────────────────────── */}
					<div className="flex shrink-0 items-center justify-between border-b px-3 py-2.5">
						<div className="flex min-w-0 items-center gap-2">
							<div
								ref={drawerHeaderIconRef}
								className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg"
							>
								<FileText className="text-primary size-4" />
							</div>
							<span className="truncate text-sm font-semibold">Documents ({documents.length})</span>
							{isLocked && (
								<div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 dark:border-amber-700 dark:bg-amber-900/30">
									<Lock className="size-2.5 text-amber-700 dark:text-amber-400" />
									<span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
										{MEETING_LOCK_BADGE_LABEL}
									</span>
								</div>
							)}
						</div>

						<div className="flex shrink-0 items-center gap-1">
							{/* Lock / Unlock */}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									if (isPrincipal && meetingId) onToggleLock(!isLocked)
								}}
								disabled={!isPrincipal || isTogglingLock}
								className={cn(
									"h-7 w-7 p-0",
									isLocked && "text-amber-600 hover:text-amber-700 dark:text-amber-400",
									!isPrincipal && "cursor-not-allowed opacity-40"
								)}
								title={lockToggleTitle}
							>
								{isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
							</Button>

							{/* Refresh */}
							<Button
								variant="ghost"
								size="sm"
								onClick={onRefresh}
								disabled={isDocumentsFetching || isRefreshingSigningStatus}
								className="h-7 w-7 p-0"
								title="Refresh documents"
							>
								<RefreshCw
									className={cn(
										"size-3.5",
										(isDocumentsFetching || isRefreshingSigningStatus) && "animate-spin"
									)}
								/>
							</Button>

							{/* Collapse */}
							<Button
								variant="ghost"
								size="sm"
								onClick={onToggleShowDocuments}
								className="h-7 w-7 p-0"
								title="Hide documents panel"
								aria-label="Hide documents panel"
							>
								<ChevronRight className="size-3.5" />
							</Button>
						</div>
					</div>

					{/* ── Lock-order banner ───────────────────────────────── */}
					{isLocked && (
						<div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/10">
							<p
								data-testid="lock-helper-text"
								className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300"
							>
								<Lock className="size-3 shrink-0" />
								{MEETING_LOCK_HELPER_TEXT}
							</p>
						</div>
					)}

					{/* ── Scrollable document list ────────────────────────── */}
					<div className="flex-1 space-y-3 overflow-y-auto p-3">
						{documents.map((doc, index) => {
							const isDragged = draggedDocumentId === doc.id
							const isDragOver = dragOverDocumentId === doc.id

							// ── Previous-document-signed gate ──────────────────
							const previousDoc = index > 0 ? documents[index - 1] : null

							const previousInternalRequests = Array.isArray(
								notarizationDocs.find(d => d?.id === previousDoc?.id)?.signatureRequests
							)
								? (notarizationDocs.find(d => d?.id === previousDoc?.id)
										?.signatureRequests as Array<{
										signerId?: unknown
										status?: unknown
									}>)
								: []

							const previousSignerUserIds = Array.isArray(
								(previousDoc as { signerUserIds?: unknown })?.signerUserIds
							)
								? (previousDoc as { signerUserIds: string[] }).signerUserIds.filter(
										v => typeof v === "string" && v.trim()
									)
								: []

							const prevStatusBySignerId = new Map<string, string>()
							for (const req of previousInternalRequests) {
								const id = typeof req?.signerId === "string" ? req.signerId.trim() : ""
								if (!id) continue
								prevStatusBySignerId.set(
									id,
									typeof req?.status === "string" ? req.status.toUpperCase() : ""
								)
							}

							const previousIsInternallySigned =
								previousSignerUserIds.length > 0 &&
								previousSignerUserIds.every(id => {
									const s = prevStatusBySignerId.get(id)
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
									(previousSigningStatus?.signedCount ?? 0) > 0)

							const isPreviousDocumentSigned =
								!previousDoc || previousIsInternallySigned || previousIsExternallySigned

							// ── This doc signing status ─────────────────────────
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
												? "scale(0.97)"
												: isDragOver && !isLocked
													? "scale(1.02)"
													: "scale(1)",
										transition:
											isDragged && !isLocked
												? "opacity 0.2s ease-out, transform 0.2s ease-out"
												: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
										zIndex: isDragged && !isLocked ? 50 : isDragOver && !isLocked ? 10 : 1,
									}}
									className={cn(
										"relative border-2 shadow-sm transition-shadow",
										isDragged
											? "cursor-grabbing shadow-xl"
											: "hover:border-primary/40 hover:shadow-md",
										isDragOver &&
											!isDragged &&
											!isLocked &&
											"border-primary bg-primary/5 shadow-lg",
										isLocked && "border-muted/50"
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
									{/* Signing status badge + overflow menu */}
									{doc.docoChainProjectId && (
										<div className="absolute top-2 right-2 z-10 flex items-center gap-1">
											{signingStatus ? (
												isFullySigned ? (
													<div className="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 dark:bg-green-900/30">
														<CheckCircle2 className="size-2.5 text-green-600 dark:text-green-400" />
														<span className="text-[9px] font-semibold text-green-700 dark:text-green-400">
															Signed
														</span>
													</div>
												) : (signingStatus.signedCount ?? 0) > 0 ? (
													<div className="flex items-center gap-1 rounded-full bg-yellow-100 px-1.5 py-0.5 dark:bg-yellow-900/30">
														<Clock className="size-2.5 text-yellow-600 dark:text-yellow-400" />
														<span className="text-[9px] font-semibold text-yellow-700 dark:text-yellow-400">
															{signingStatus.signedCount}/{signingStatus.totalSigners}
														</span>
													</div>
												) : (
													<div className="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
														<Clock className="size-2.5 text-gray-500 dark:text-gray-400" />
														<span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400">
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
														className="h-6 w-6 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
														title="More actions"
													>
														<MoreVertical className="size-3" />
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

									<CardContent className="p-3">
										{/* Document header row */}
										<div className="mb-3 flex items-start gap-2">
											{/* Drag handle */}
											<div
												className={cn(
													"mt-1 shrink-0 transition-colors",
													isLocked
														? "cursor-not-allowed opacity-30"
														: "text-muted-foreground hover:text-primary cursor-move"
												)}
												draggable={!isLocked}
												onDragStart={e => handleDragStart(e, doc.id)}
												onDragEnd={handleDragEnd}
												title={reorderTitle}
											>
												<GripVertical className="size-4" />
											</div>

											{/* File icon */}
											<div className="bg-primary/10 mt-0.5 shrink-0 rounded-md p-2">
												<FileText className="text-primary size-4" />
											</div>

											{/* Name + meta */}
											<div className="min-w-0 flex-1">
												{/* Lock order badge sits inline above the name when locked */}
												{isLocked && (
													<div className="mb-1 flex items-center gap-1">
														<div className="flex size-3.5 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white dark:bg-amber-500">
															{index + 1}
														</div>
														<Lock className="size-2.5 text-amber-700 dark:text-amber-400" />
													</div>
												)}
												<div className="flex items-center gap-2">
													<p
														className="truncate text-sm leading-tight font-semibold"
														title={doc.name}
													>
														{doc.name}
													</p>
													{(() => {
														const fees = doc.fees
														const showFees =
															fees !== null &&
															fees !== undefined &&
															typeof fees === "number" &&
															!Number.isNaN(fees)
														return showFees ? (
															<span className="text-muted-foreground shrink-0 text-xs font-semibold">
																PHP {fees.toFixed(2)}
															</span>
														) : null
													})()}
												</div>
												<p className="text-muted-foreground mt-0.5 text-xs">
													{(doc.size / 1024).toFixed(1)} KB · PDF
												</p>
												{doc.notarizationType && (
													<p className="text-muted-foreground mt-0.5 text-xs font-medium">
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
											</div>
										</div>

										{/* All signing controls, signer lists, action buttons */}
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
											signerRoles={(doc as { signerRoles?: Record<string, "principal" | "witness"> }).signerRoles}
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

					{totalFees > 0 && (
						<div className="bg-muted/30 shrink-0 border-t px-3 py-2.5">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">Total Fees</span>
								<span className="text-sm font-bold">PHP {totalFees.toFixed(2)}</span>
							</div>
						</div>
					)}
				</div>
			</>
		)
	})
)
