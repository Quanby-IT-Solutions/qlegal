"use client"

import React, { useCallback, useMemo, useState } from "react"
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	DollarSign,
	Download,
	ExternalLink,
	Eye,
	FileText,
	Loader2,
	Lock,
	RefreshCw,
	UserPlus,
} from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

import { SignerManagementModal } from "./signer-management-modal"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DocumentSidebarDocument {
	id: string
	name: string
	docoChainProjectId: string | null
	/** File size in bytes */
	size?: number | null
	/** MIME type or simple label e.g. "application/pdf" */
	fileType?: string | null
	/** Notarization type enum */
	notarizationType?: string | null
	/** Current signer user IDs (before project creation) */
	signerUserIds?: string[] | null
	/** Optional per-document cost */
	cost?: number | null
	/** Optional currency code. Defaults to "PHP" */
	currency?: string | null
}

export interface DocumentSidebarSigningStatus {
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

export interface DocumentSidebarProps {
	documents: DocumentSidebarDocument[]
	documentSigningStatus: Map<string, DocumentSidebarSigningStatus>
	/** Meeting participants — forwarded to SignerManagementModal */
	participants: Array<{
		userId: string
		user: { id: string; name: string | null; email: string | null; role?: string | null } | null
	}>
	/** Called when signers are saved for a document — same signature as handleSignersChange */
	onSignersChange: (documentId: string, userIds: string[]) => void
	/** Whether document order is locked */
	isDocumentOrderLocked?: boolean
	/** Whether we are currently fetching/refreshing */
	isRefreshing?: boolean
	onRefresh?: () => void
	onDownloadSigned?: (projectUuid: string) => void
	onDownloadCertificate?: (projectUuid: string) => void
	downloadingProjectUuid?: string | null
	downloadingCertificateUuid?: string | null
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatCurrency(amount: number, currency = "PHP") {
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileType(mimeType: string | null | undefined): string {
	if (!mimeType) return "PDF"
	if (mimeType.includes("pdf")) return "PDF"
	if (mimeType.includes("word") || mimeType.includes("docx")) return "DOCX"
	if (mimeType.includes("png")) return "PNG"
	if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPG"
	const parts = mimeType.split("/")
	return (parts[1] ?? mimeType).toUpperCase().slice(0, 6)
}

function formatNotarizationType(type: string | null | undefined): string | null {
	if (!type) return null
	switch (type) {
		case "ACKNOWLEDGMENT":
			return "Acknowledgment"
		case "AFFIRMATION":
			return "Affirmation"
		case "JURAT":
			return "Jurat"
		case "SIGNATURE_WITNESSING":
			return "Sig. Witnessing"
		default:
			return type
	}
}

function getSigningBadge(
	doc: DocumentSidebarDocument,
	status: DocumentSidebarSigningStatus | undefined
) {
	if (!doc.docoChainProjectId || !status) {
		return { label: "Not started", color: "gray", icon: null } as const
	}
	const statusUpper = String(status.projectStatus ?? "").toUpperCase()
	const isCompleted =
		statusUpper === "COMPLETED" || (status.completedAt !== null && status.completedAt !== undefined)
	const isFullySigned =
		status.isFullySigned === true ||
		((status.totalSigners ?? 0) > 0 &&
			(status.signedCount ?? 0) === (status.totalSigners ?? 0) &&
			(status.signedCount ?? 0) > 0)
	if (isCompleted) return { label: "Completed", color: "emerald", icon: "check" } as const
	if (isFullySigned) return { label: "Signed", color: "green", icon: "check" } as const
	if ((status.signedCount ?? 0) > 0)
		return {
			label: `${status.signedCount}/${status.totalSigners}`,
			color: "yellow",
			icon: "partial",
		} as const
	return { label: "Pending", color: "gray", icon: "clock" } as const
}

// ─────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────

const StatusBadge = React.memo(function StatusBadge({
	badge,
	compact = false,
}: {
	badge: ReturnType<typeof getSigningBadge>
	compact?: boolean
}) {
	const sz = compact ? "size-4" : "size-3"
	const icon =
		badge.icon === "check" ? (
			<CheckCircle2
				className={cn(
					sz,
					badge.color === "emerald" ? "text-emerald-500" : "text-green-500 dark:text-green-400"
				)}
			/>
		) : badge.icon === "partial" ? (
			<AlertCircle className={cn(sz, "text-yellow-500 dark:text-yellow-400")} />
		) : badge.icon === "clock" ? (
			<Clock className={cn(sz, "text-gray-400")} />
		) : null

	if (compact) return <>{icon}</>

	const colorMap: Record<string, string> = {
		emerald:
			"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
		green:
			"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
		yellow:
			"bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
		gray: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
				colorMap[badge.color] ?? colorMap.gray
			)}
		>
			{icon}
			{badge.label}
		</span>
	)
})

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const DocumentSidebar = React.memo(function DocumentSidebar({
	documents,
	documentSigningStatus,
	participants,
	onSignersChange,
	isDocumentOrderLocked = false,
	isRefreshing = false,
	onRefresh,
	onDownloadSigned,
	onDownloadCertificate,
	downloadingProjectUuid,
	downloadingCertificateUuid,
}: DocumentSidebarProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	// Track which document's signer modal is open
	const [signerModalDocId, setSignerModalDocId] = useState<string | null>(null)
	const signerModalDoc = useMemo(
		() => documents.find(d => d.id === signerModalDocId) ?? null,
		[documents, signerModalDocId]
	)

	const totalCost = useMemo(() => documents.reduce((s, d) => s + (d.cost ?? 0), 0), [documents])
	const hasCosts = useMemo(() => documents.some(d => d.cost !== undefined && d.cost !== null && d.cost > 0), [documents])
	const defaultCurrency = documents.find(d => d.currency)?.currency ?? "PHP"
	const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), [])

	if (!documents || documents.length === 0) return null

	// ─────────────────────────────────────────────────────────────────
	// COLLAPSED  (48px strip)
	// ─────────────────────────────────────────────────────────────────
	const collapsedSidebar = (
		<div className="border-border/60 bg-card/90 absolute top-0 right-0 z-40 flex h-full w-12 flex-col border-l shadow-2xl backdrop-blur-md">
			<button
				onClick={toggleExpanded}
				className="border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground flex h-11 w-full items-center justify-center border-b transition-colors"
				title="Open documents panel"
			>
				<ChevronLeft className="size-4" />
			</button>

			<div className="scrollbar-thin flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-2">
				{documents.map((doc, index) => {
					const status = doc.docoChainProjectId ? documentSigningStatus.get(doc.id) : undefined
					const badge = getSigningBadge(doc, status)
					const hasNoSigners =
						!doc.docoChainProjectId && (!doc.signerUserIds || doc.signerUserIds.length === 0)
					const colorMap: Record<string, string> = {
						emerald: "text-emerald-500",
						green: "text-green-500",
						yellow: "text-yellow-500",
						gray: "text-muted-foreground",
					}
					return (
						<button
							key={doc.id}
							onClick={toggleExpanded}
							className="group hover:bg-muted/60 relative flex flex-col items-center rounded-lg p-1.5 transition-colors"
							title={doc.name}
						>
							{isDocumentOrderLocked && (
								<span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
									{index + 1}
								</span>
							)}
							{hasNoSigners && (
								<span className="absolute -top-0.5 -left-0.5 flex size-3 items-center justify-center rounded-full bg-yellow-400">
									<AlertTriangle className="size-2 text-yellow-900" />
								</span>
							)}
							<FileText
								className={cn(
									"group-hover:text-primary size-5 transition-colors",
									colorMap[badge.color] ?? "text-muted-foreground"
								)}
							/>
							<span
								className={cn(
									"mt-0.5 size-1.5 rounded-full",
									badge.color === "emerald" || badge.color === "green"
										? "bg-green-500"
										: badge.color === "yellow"
											? "bg-yellow-500"
											: "bg-gray-400"
								)}
							/>
						</button>
					)
				})}
			</div>

			{hasCosts && (
				<div className="border-border/50 flex flex-col items-center border-t pt-2 pb-3">
					<DollarSign className="text-primary mb-0.5 size-3.5" />
					<span className="text-primary text-[9px] leading-none font-bold">
						{totalCost >= 1000
							? `${Math.round(totalCost / 1000)}k`
							: totalCost > 0
								? totalCost.toFixed(0)
								: "—"}
					</span>
					<span className="text-muted-foreground mt-0.5 text-[8px] leading-none">total</span>
				</div>
			)}
		</div>
	)

	// ─────────────────────────────────────────────────────────────────
	// EXPANDED  (320px overlay drawer)
	// ─────────────────────────────────────────────────────────────────
	const expandedSidebar = (
		<div className="border-border/60 bg-card/95 absolute top-0 right-0 z-40 flex h-full w-80 flex-col border-l shadow-2xl backdrop-blur-md">
			{/* Header */}
			<div className="border-border/50 flex h-11 shrink-0 items-center justify-between border-b px-3">
				<div className="flex items-center gap-2">
					<div className="bg-primary/10 flex size-6 items-center justify-center rounded-md">
						<FileText className="text-primary size-3.5" />
					</div>
					<span className="text-sm font-semibold">
						Documents
						<span className="bg-muted text-muted-foreground ml-1.5 inline-flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold">
							{documents.length}
						</span>
					</span>
					{isDocumentOrderLocked && (
						<span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
							<Lock className="size-2.5" />
							Locked
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					{onRefresh && (
						<button
							onClick={onRefresh}
							disabled={isRefreshing}
							className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40"
							title="Refresh"
						>
							<RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
						</button>
					)}
					<button
						onClick={toggleExpanded}
						className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
						title="Collapse"
					>
						<ChevronRight className="size-4" />
					</button>
				</div>
			</div>

			{/* Document cards */}
			<div className="flex-1 overflow-y-auto">
				<TooltipProvider delayDuration={300}>
					<div className="divide-border/40 divide-y">
						{documents.map((doc, index) => {
							const status = doc.docoChainProjectId ? documentSigningStatus.get(doc.id) : undefined
							const badge = getSigningBadge(doc, status)

							const statusUpper = String(status?.projectStatus ?? "").toUpperCase()
							const isCompleted =
								statusUpper === "COMPLETED" ||
								(status?.completedAt !== null && status?.completedAt !== undefined)
							const isFullySigned =
								status?.isFullySigned === true ||
								((status?.totalSigners ?? 0) > 0 &&
									(status?.signedCount ?? 0) === (status?.totalSigners ?? 0) &&
									(status?.signedCount ?? 0) > 0)
							const isPreparingNotarized =
								isFullySigned && !isCompleted && (status?.signedCount ?? 0) > 0
							const isDownloadingSigned =
								!!doc.docoChainProjectId && downloadingProjectUuid === doc.docoChainProjectId
							const isDownloadingCert =
								!!doc.docoChainProjectId && downloadingCertificateUuid === doc.docoChainProjectId

							// No signers yet and no project — show warning
							const hasNoSigners =
								!doc.docoChainProjectId && (!doc.signerUserIds || doc.signerUserIds.length === 0)
							// Only show Add Signer when no project exists yet (same condition as DocumentActions)
							const showAddSigner = !doc.docoChainProjectId && participants.length > 0

							// File metadata
							const fileSizeLabel =
								doc.size !== undefined && doc.size !== null && doc.size > 0 ? formatFileSize(doc.size) : null
							const fileTypeLabel = formatFileType(doc.fileType)
							const notarizationLabel = formatNotarizationType(doc.notarizationType)

							return (
								<div
									key={doc.id}
									className={cn(
										"hover:bg-muted/30 px-3 py-3 transition-colors",
										isDocumentOrderLocked && index > 0 && "opacity-80"
									)}
								>
									{/* ── Row 1: Icon + name + action buttons ── */}
									<div className="mb-2 flex items-start gap-2">
										{isDocumentOrderLocked && (
											<span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
												{index + 1}
											</span>
										)}
										<div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg">
											<FileText className="text-primary size-4" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-xs leading-tight font-semibold" title={doc.name}>
												{doc.name}
											</p>
										</div>

										{/* Action icon buttons */}
										<div className="flex shrink-0 items-center gap-0.5">
											{/* Add Signer — only when no project exists yet, same gate as DocumentActions */}
											{showAddSigner && (
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															onClick={() => setSignerModalDocId(doc.id)}
															className={cn(
																"flex size-6 items-center justify-center rounded-md transition-colors",
																hasNoSigners
																	? "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
																	: "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
															)}
															aria-label="Manage signers"
														>
															<UserPlus className="size-3.5" />
														</button>
													</TooltipTrigger>
													<TooltipContent side="left" className="max-w-44 text-[11px]">
														{hasNoSigners
															? "Add signer first before setting signers"
															: `Manage signers (${doc.signerUserIds?.length ?? 0} selected)`}
													</TooltipContent>
												</Tooltip>
											)}

											{/* View Document — opens /api/documents/:id exactly like DocumentActions */}
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														onClick={() => window.open(`/api/documents/${doc.id}`, "_blank")}
														className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex size-6 items-center justify-center rounded-md transition-colors"
														aria-label="View document"
													>
														<Eye className="size-3.5" />
													</button>
												</TooltipTrigger>
												<TooltipContent side="left" className="text-[11px]">
													View document
												</TooltipContent>
											</Tooltip>

											{/* View Notarized — only when project exists */}
											{doc.docoChainProjectId && (
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															disabled={!isCompleted || isDownloadingSigned || isPreparingNotarized}
															onClick={() => {
																if (doc.docoChainProjectId && isCompleted) {
																	onDownloadSigned?.(doc.docoChainProjectId)
																}
															}}
															className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex size-6 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
															aria-label="View notarized document"
														>
															{isDownloadingSigned || isPreparingNotarized ? (
																<Loader2 className="size-3.5 animate-spin" />
															) : (
																<ExternalLink className="size-3.5" />
															)}
														</button>
													</TooltipTrigger>
													<TooltipContent side="left" className="text-[11px]">
														{isDownloadingSigned
															? "Opening…"
															: isPreparingNotarized
																? "Preparing notarized doc…"
																: isCompleted
																	? "View notarized document"
																	: "Available when completed"}
													</TooltipContent>
												</Tooltip>
											)}

											{/* Download Certificate — only when project exists */}
											{doc.docoChainProjectId && (
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															disabled={!isCompleted || isDownloadingCert}
															onClick={() => {
																if (doc.docoChainProjectId) {
																	onDownloadCertificate?.(doc.docoChainProjectId)
																}
															}}
															className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex size-6 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
															aria-label="Download certificate"
														>
															{isDownloadingCert ? (
																<Loader2 className="size-3.5 animate-spin" />
															) : (
																<Download className="size-3.5" />
															)}
														</button>
													</TooltipTrigger>
													<TooltipContent side="left" className="text-[11px]">
														{isDownloadingCert
															? "Downloading…"
															: isCompleted
																? "Download certificate"
																: "Available when completed"}
													</TooltipContent>
												</Tooltip>
											)}
										</div>
									</div>

									{/* ── Row 2: File metadata chips ── */}
									<div className="mb-2 flex flex-wrap items-center gap-1">
										{fileSizeLabel && (
											<span className="bg-muted/60 text-muted-foreground inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium">
												{fileSizeLabel}
											</span>
										)}
										<span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
											{fileTypeLabel}
										</span>
										{notarizationLabel && (
											<span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
												{notarizationLabel}
											</span>
										)}
									</div>

									{/* ── Row 3: No-signer warning ── */}
									{hasNoSigners && (
										<div className="mb-2 flex items-start gap-1.5 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1.5 dark:border-yellow-800/50 dark:bg-yellow-900/10">
											<AlertTriangle className="mt-0.5 size-3 shrink-0 text-yellow-500" />
											<p className="text-[10px] leading-snug text-yellow-700 dark:text-yellow-400">
												Add signer first after setting signers
											</p>
										</div>
									)}

									{/* ── Row 4: Status + progress bar ── */}
									<div className="flex items-center gap-2">
										<StatusBadge badge={badge} />
										{status && (status.totalSigners ?? 0) > 0 && (
											<div className="flex flex-1 items-center gap-1.5">
												<div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
													<div
														className={cn(
															"h-full rounded-full transition-all duration-500",
															badge.color === "emerald" || badge.color === "green"
																? "bg-green-500"
																: badge.color === "yellow"
																	? "bg-yellow-500"
																	: "bg-gray-300"
														)}
														style={{
															width: `${Math.round(((status.signedCount ?? 0) / (status.totalSigners ?? 1)) * 100)}%`,
														}}
													/>
												</div>
												<span className="text-muted-foreground shrink-0 text-[10px]">
													{status.signedCount}/{status.totalSigners}
												</span>
											</div>
										)}
									</div>

									{/* ── Row 5: Cost ── */}
									{doc.cost !== undefined && doc.cost !== null && doc.cost > 0 && (
										<div className="bg-muted/40 mt-2 flex items-center justify-between rounded-md px-2 py-1">
											<span className="text-muted-foreground text-[10px]">Document cost</span>
											<span className="text-foreground text-[11px] font-bold">
												{formatCurrency(doc.cost, doc.currency ?? defaultCurrency)}
											</span>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</TooltipProvider>
			</div>

			{/* Total Cost Footer */}
			{hasCosts && (
				<div className="border-border/60 from-primary/5 to-primary/10 shrink-0 border-t bg-gradient-to-r px-3 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<div className="bg-primary/15 flex size-6 items-center justify-center rounded-md">
								<DollarSign className="text-primary size-3.5" />
							</div>
							<span className="text-foreground text-xs font-semibold">Total Cost</span>
						</div>
						<div className="flex flex-col items-end">
							<span className="text-primary text-sm font-bold">
								{formatCurrency(totalCost, defaultCurrency)}
							</span>
							<span className="text-muted-foreground text-[9px]">
								{documents.length} document{documents.length !== 1 ? "s" : ""}
							</span>
						</div>
					</div>
					<div className="mt-2 flex flex-wrap gap-1">
						{documents
							.filter(d => d.cost !== undefined && d.cost !== null && d.cost > 0)
							.map(doc => (
								<span
									key={doc.id}
									className="bg-muted/70 text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
									title={doc.name}
								>
									<FileText className="size-2.5 shrink-0" />
									<span className="max-w-16 truncate">{doc.name.replace(/\.[^.]+$/, "")}</span>
									<span className="text-foreground/80 font-semibold">
										{formatCurrency(doc.cost!, doc.currency ?? defaultCurrency)}
									</span>
								</span>
							))}
					</div>
				</div>
			)}

			{/* Signer Management Modal — rendered once here, opened per-document */}
			{signerModalDoc && (
				<SignerManagementModal
					participants={participants}
					signerUserIds={signerModalDoc.signerUserIds ?? []}
					onSignersChange={userIds => {
						onSignersChange(signerModalDoc.id, userIds)
						setSignerModalDocId(null)
					}}
					isOpen={signerModalDocId !== null}
					onOpenChange={open => {
						if (!open) setSignerModalDocId(null)
					}}
				/>
			)}
		</div>
	)

	return (
		<>
			{isExpanded && (
				<div
					className="absolute inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
					onClick={toggleExpanded}
					aria-hidden="true"
				/>
			)}
			<div
				className={cn(
					"absolute top-0 right-0 z-40 h-full transition-all duration-300 ease-in-out",
					isExpanded ? "w-80" : "w-12"
				)}
				aria-label="Documents panel"
				role="complementary"
			>
				{isExpanded ? expandedSidebar : collapsedSidebar}
			</div>
		</>
	)
})
