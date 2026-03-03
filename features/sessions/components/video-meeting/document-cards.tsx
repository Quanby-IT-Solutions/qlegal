"use client"

import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"
import {
	CheckCircle2,
	Clock,
	FileText,
	GripVertical,
	Lock,
	MoreVertical,
	PanelLeftIcon,
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
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/core/components/ui/sidebar"
import { cn } from "@/core/lib/utils"

import {
	getDocumentReorderTitle,
	getMeetingLockToggleLabel,
	MEETING_LOCK_BADGE_LABEL,
} from "@/features/sessions/lib/meeting-lock-contract"

import type { PreGeneratedLinkEntry } from "../../lib/utils"
import { DocumentActions } from "./document-actions"
import { NotarizedDocumentMenuItem } from "./notarized-document-menu-item"

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
						firstName?: string | null
						middleName?: string | null
						lastName?: string | null
						/** Back-compat for older session payloads */
						name?: string | null
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

export interface DocumentCardsHandle {
	getSidebarTarget: () => { x: number; y: number } | null
}

export const DocumentCards = React.memo(
	React.forwardRef<DocumentCardsHandle, DocumentCardsProps>(function DocumentCards(
		{
			meetingId,
			documents,
			showDocuments,
			onToggleShowDocuments: _onToggleShowDocuments,
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
		const { toggleSidebar } = useSidebar()

		const isPrincipal = meetingDetails?.createdBy?.id === session?.user?.id
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		const lockToggleTitle: string = !isPrincipal
			? "Only the meeting creator can lock or unlock document uploads"
			: getMeetingLockToggleLabel(Boolean(isLocked))
		const reorderTitle: string = getDocumentReorderTitle()

		const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
		const [dragOverDocumentId, setDragOverDocumentId] = useState<string | null>(null)
		const collapsedIconRef = useRef<HTMLButtonElement>(null)
		const drawerHeaderIconRef = useRef<HTMLDivElement>(null)

		useImperativeHandle(ref, () => ({
			getSidebarTarget: () => {
				const el =
					(showDocuments ? drawerHeaderIconRef.current : collapsedIconRef.current) ??
					drawerHeaderIconRef.current ??
					collapsedIconRef.current
				if (!el) return null
				const rect = el.getBoundingClientRect()
				return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
			},
		}))

		const handleDragStart = useCallback((e: React.DragEvent, documentId: string) => {
			const target = e.target as HTMLElement
			if (target.closest("button") || target.closest("a") || target.closest('[role="button"]')) {
				e.preventDefault()
				return
			}
			setDraggedDocumentId(documentId)
			e.dataTransfer.effectAllowed = "move"
			e.dataTransfer.setData("text/plain", documentId)
		}, [])

		const handleDragEnter = useCallback(
			(e: React.DragEvent, targetDocumentId: string) => {
				e.preventDefault()
				if (!draggedDocumentId || targetDocumentId === draggedDocumentId) return
				setDragOverDocumentId(targetDocumentId)
			},
			[draggedDocumentId]
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
				e.preventDefault()
				e.dataTransfer.dropEffect = "move"
				if (draggedDocumentId && targetDocumentId !== draggedDocumentId) {
					setDragOverDocumentId(targetDocumentId)
				}
			},
			[draggedDocumentId]
		)

		const handleDrop = useCallback(
			(e: React.DragEvent, targetDocumentId: string) => {
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
			[documents, draggedDocumentId, onUpdateDocumentOrder]
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

		const totalFees = useMemo(
			() =>
				documents.reduce((sum, doc) => {
					const fees = doc.fees
					const hasValidFees =
						fees !== null && fees !== undefined && typeof fees === "number" && !Number.isNaN(fees)
					return hasValidFees ? sum + fees : sum
				}, 0),
			[documents]
		)

		if (!documents || documents.length === 0) return null

		return (
			<Sidebar side="right" collapsible="icon" variant="sidebar" className="border-l">
				<SidebarHeader className="flex shrink-0 items-center border-b px-3 py-2.5">
					<div className="flex min-w-0 flex-wrap items-center gap-1.5">
						<div
							ref={drawerHeaderIconRef}
							className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg"
						>
							<FileText className="text-primary size-4" />
						</div>
						<span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
							Documents ({documents.length})
						</span>
						{isLocked && (
							<div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 group-data-[collapsible=icon]:hidden dark:border-amber-700 dark:bg-amber-900/30">
								<Lock className="size-2.5 text-amber-700 dark:text-amber-400" />
								<span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
									{MEETING_LOCK_BADGE_LABEL}
								</span>
							</div>
						)}

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
								!isPrincipal && "cursor-not-allowed opacity-40",
								"group-data-[collapsible=icon]:hidden"
							)}
							title={lockToggleTitle}
						>
							{isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={onRefresh}
							disabled={isDocumentsFetching || isRefreshingSigningStatus}
							className="h-7 w-7 p-0 group-data-[collapsible=icon]:hidden"
							title="Refresh documents"
						>
							<RefreshCw
								className={cn(
									"size-3.5",
									(isDocumentsFetching || isRefreshingSigningStatus) && "animate-spin"
								)}
							/>
						</Button>
					</div>
				</SidebarHeader>

				<SidebarContent className="space-y-3 p-3">
					<div className="group-data-[collapsible=icon]:hidden">
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleSidebar}
							className="h-8 w-full justify-start"
							title="Hide documents panel"
							aria-label="Hide documents panel"
						>
							<PanelLeftIcon className="mr-2 size-4" />
							<span>Hide Documents</span>
						</Button>
					</div>

					<SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
						<SidebarMenuItem>
							<SidebarMenuButton
								ref={collapsedIconRef}
								tooltip="Expand documents panel"
								onClick={toggleSidebar}
								className="justify-center group-data-[collapsible=icon]:justify-center"
								aria-label="Expand documents panel"
							>
								<PanelLeftIcon className="size-4" />
								<span className="sr-only">Expand documents panel</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						{documents.map(doc => (
							<SidebarMenuItem key={`icon-${doc.id}`}>
								<SidebarMenuButton
									tooltip={doc.name}
									className="justify-center group-data-[collapsible=icon]:justify-center"
									aria-label={doc.name}
								>
									<FileText className="size-4" />
									<span className="sr-only">{doc.name}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>

					<div className="space-y-3 group-data-[collapsible=icon]:hidden">
						{documents.map((doc, index) => {
							const isDragged = draggedDocumentId === doc.id
							const isDragOver = dragOverDocumentId === doc.id

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
										opacity: isDragged ? 0.5 : 1,
										transform: isDragged ? "scale(0.97)" : isDragOver ? "scale(1.02)" : "scale(1)",
										transition: isDragged
											? "opacity 0.2s ease-out, transform 0.2s ease-out"
											: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
										zIndex: isDragged ? 50 : isDragOver ? 10 : 1,
									}}
									className={cn(
										"relative border-2 shadow-sm transition-shadow",
										isDragged
											? "cursor-grabbing shadow-xl"
											: "hover:border-primary/40 hover:shadow-md",
										isDragOver && !isDragged && "border-primary bg-primary/5 shadow-lg"
									)}
									onDragEnter={e => handleDragEnter(e, doc.id)}
									onDragLeave={handleDragLeave}
									onDragOver={e => handleDragOver(e, doc.id)}
									onDrop={e => handleDrop(e, doc.id)}
								>
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
										<div className="mb-3 flex items-start gap-2">
											<div
												className={cn(
													"mt-1 shrink-0 transition-colors",
													"text-muted-foreground hover:text-primary cursor-move"
												)}
												draggable
												onDragStart={e => handleDragStart(e, doc.id)}
												onDragEnd={handleDragEnd}
												title={reorderTitle}
											>
												<GripVertical className="size-4" />
											</div>

											<div className="bg-primary/10 mt-0.5 shrink-0 rounded-md p-2">
												<FileText className="text-primary size-4" />
											</div>

											<div className="min-w-0 flex-1">
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
											signerRoles={
												(doc as { signerRoles?: Record<string, "principal" | "witness"> })
													.signerRoles
											}
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
				</SidebarContent>

				{totalFees > 0 && (
					<SidebarFooter className="bg-muted/30 shrink-0 border-t px-3 py-2.5 group-data-[collapsible=icon]:hidden">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">Total Fees</span>
							<span className="text-sm font-bold">PHP {totalFees.toFixed(2)}</span>
						</div>
					</SidebarFooter>
				)}
			</Sidebar>
		)
	})
)
