"use client"

import React from "react"
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Download,
	ExternalLink,
	Eye,
	FileText,
	Loader2,
	UserPlus,
} from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

interface DocumentCardProps {
	id: string
	name: string
	size?: number | null
	fileType?: string | null
	notarizationType?: string | null
	signerUserIds?: string[] | null
	cost?: number | null
	currency?: string | null
	docoChainProjectId?: string | null
	isDocumentOrderLocked?: boolean
	index?: number
	badge?: {
		label: string
		color: string
		icon: React.ReactNode
	}
	status?: {
		isFullySigned?: boolean
		signedCount?: number
		totalSigners?: number
		projectStatus?: string
		completedAt?: string | null
	}
	hasNoSigners?: boolean
	showAddSigner?: boolean
	isDownloadingSigned?: boolean
	isDownloadingCert?: boolean
	isPreparingNotarized?: boolean
	isCompleted?: boolean
	onAddSigner?: () => void
	onViewDocument?: () => void
	onViewNotarized?: () => void
	onDownloadCertificate?: () => void
	formatFileSize?: (size: number) => string
	formatFileType?: (type: string | null | undefined) => string
	formatNotarizationType?: (type: string | null | undefined) => string
	formatCurrency?: (amount: number, currency: string) => string
}

// Helper to determine status color for left border
const getStatusBorderColor = (badge: DocumentCardProps["badge"]) => {
	if (!badge) return "border-l-gray-300"

	const colorMap: Record<string, string> = {
		emerald: "border-l-emerald-500",
		green: "border-l-green-500",
		yellow: "border-l-amber-500",
		gray: "border-l-gray-400",
		default: "border-l-gray-300",
	}

	return colorMap[badge.color] ?? colorMap.default
}

// Helper to determine status bar fill color
const getStatusFillColor = (color: string) => {
	const fillMap: Record<string, string> = {
		emerald: "bg-emerald-500",
		green: "bg-green-500",
		yellow: "bg-amber-500",
		gray: "bg-gray-400",
		default: "bg-gray-300",
	}

	return fillMap[color] ?? fillMap.default
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
	id,
	name,
	size,
	fileType,
	notarizationType,
	signerUserIds,
	cost,
	currency = "PHP",
	docoChainProjectId,
	isDocumentOrderLocked,
	index = 0,
	badge,
	status,
	hasNoSigners,
	showAddSigner,
	isDownloadingSigned,
	isDownloadingCert,
	isPreparingNotarized,
	isCompleted,
	onAddSigner,
	onViewDocument,
	onViewNotarized,
	onDownloadCertificate,
	formatFileSize,
	formatFileType,
	formatNotarizationType,
	formatCurrency,
}) => {
	const statusBorderColor = getStatusBorderColor(badge)
	const statusFillColor = getStatusFillColor(badge?.color ?? "default")
	const progressPercentage =
		status && (status.totalSigners ?? 0) > 0
			? Math.round(((status.signedCount ?? 0) / (status.totalSigners ?? 1)) * 100)
			: 0

	return (
		<div
			className={cn(
				"group border-border/50 bg-background hover:border-border/80 hover:bg-muted/30 relative rounded-lg border px-4 py-3 transition-all duration-200 hover:shadow-sm",
				statusBorderColor,
				"border-l-4",
				isDocumentOrderLocked && index > 0 && "opacity-80"
			)}
		>
			{/* Header Row: Icon + Name + Actions */}
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					{/* Order indicator if locked */}
					{isDocumentOrderLocked && (
						<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
							{index + 1}
						</span>
					)}

					{/* File icon */}
					<div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
						<FileText className="text-primary size-4" />
					</div>

					{/* Document name */}
					<div className="min-w-0 flex-1">
						<p className="text-foreground truncate text-sm leading-snug font-semibold" title={name}>
							{name}
						</p>

						{/* Metadata: File type, size, notarization */}
						<div className="mt-1 flex items-center gap-1.5">
							{formatFileType && fileType && (
								<span className="text-muted-foreground text-xs">{formatFileType(fileType)}</span>
							)}
							{formatFileSize && size && size > 0 && (
								<>
									<span className="text-muted-foreground text-xs">•</span>
									<span className="text-muted-foreground text-xs">{formatFileSize(size)}</span>
								</>
							)}
							{notarizationType && (
								<>
									<span className="text-muted-foreground text-xs">•</span>
									<span className="text-muted-foreground text-xs">{notarizationType}</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Right: Status badge + Cost */}
				<div className="flex shrink-0 flex-col items-end gap-1">
					{badge && (
						<div
							className={cn(
								"inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
								badge.color === "emerald" || badge.color === "green"
									? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
									: badge.color === "yellow"
										? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
										: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
							)}
						>
							{badge.icon}
							<span>{badge.label}</span>
						</div>
					)}
					{cost !== undefined && cost !== null && cost > 0 && formatCurrency && (
						<span className="text-foreground text-xs font-semibold">
							{formatCurrency(cost, currency)}
						</span>
					)}
				</div>
			</div>

			{/* Progress bar (if has signers) */}
			{status && (status.totalSigners ?? 0) > 0 && (
				<div className="mb-3 flex items-center gap-2">
					<div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
						<div
							className={cn("h-full rounded-full transition-all duration-500", statusFillColor)}
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
					<span className="text-muted-foreground shrink-0 text-xs font-medium">
						{status.signedCount}/{status.totalSigners}
					</span>
				</div>
			)}

			{/* Warning: No signers */}
			{hasNoSigners && (
				<div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200/60 bg-amber-50/50 px-2 py-1.5 dark:border-amber-800/40 dark:bg-amber-900/10">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
					<p className="text-xs leading-snug text-amber-700 dark:text-amber-400">
						Add signer first before setting signers
					</p>
				</div>
			)}

			{/* Action buttons row */}
			<div className="border-border/30 flex items-center gap-1.5 border-t pt-1">
				{/* Add Signer */}
				{showAddSigner && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={onAddSigner}
								className={cn(
									"flex size-8 items-center justify-center rounded-md transition-all duration-150",
									hasNoSigners
										? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
										: "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
								)}
								aria-label="Manage signers"
							>
								<UserPlus className="size-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							{hasNoSigners
								? "Add signer first before setting signers"
								: `Manage signers (${signerUserIds?.length ?? 0} selected)`}
						</TooltipContent>
					</Tooltip>
				)}

				{/* View Document */}
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={onViewDocument}
							className="text-muted-foreground hover:bg-muted/70 hover:text-foreground flex size-8 items-center justify-center rounded-md transition-all duration-150"
							aria-label="View document"
						>
							<Eye className="size-4" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="text-xs">
						View document
					</TooltipContent>
				</Tooltip>

				{/* View Notarized */}
				{docoChainProjectId && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								disabled={!isCompleted || isDownloadingSigned || isPreparingNotarized}
								onClick={onViewNotarized}
								className="text-muted-foreground hover:bg-muted/70 hover:text-foreground flex size-8 items-center justify-center rounded-md transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
								aria-label="View notarized document"
							>
								{isDownloadingSigned || isPreparingNotarized ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<ExternalLink className="size-4" />
								)}
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
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

				{/* Download Certificate */}
				{docoChainProjectId && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								disabled={!isCompleted || isDownloadingCert}
								onClick={onDownloadCertificate}
								className="text-muted-foreground hover:bg-muted/70 hover:text-foreground flex size-8 items-center justify-center rounded-md transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
								aria-label="Download certificate"
							>
								{isDownloadingCert ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Download className="size-4" />
								)}
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
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
	)
}
