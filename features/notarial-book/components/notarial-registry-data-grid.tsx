"use client"

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import {
	functionalUpdate,
	getCoreRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnOrderState,
	type PaginationState,
	type SortingState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import {
	ChevronDown,
	ChevronRight,
	CloudUpload,
	Copy,
	Download,
	Eye,
	FileCheck,
	Hash,
	Loader2,
} from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"

import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"

export type SortBy =
	| "executedAt"
	| "meetingEndedAt"
	| "registryNumber"
	| "principalName"
	| "documentName"
	| "certificateNumber"
	| "actType"
	| "workflow"

export type SortDir = "asc" | "desc"

export interface NotarialActRow {
	id: string
	executedAt: Date | string
	meetingEndedAt?: Date | string | null
	actType: string
	workflow: string
	principalName: string
	principalIdNumber?: string | null
	principalIdImageBase64?: string | null
	principalIdType?: string | null
	principalAddress?: string | null
	locationStatement?: string | null
	witnessName?: string | null
	documentName?: string | null
	documentDescription?: string | null
	location?: string | null
	certificateNumber?: string | null
	documentId?: string | null
	docoChainProjectUuid?: string | null
	fees?: number | null
	registryNumber?: number | null
	supremeCourtRegistryId?: string | null
	syncedToSupremeCourt?: boolean | null
	principalIdentityCheckId?: string | null
	principalSavedIdId?: string | null
	identityCheckSnapshot?: {
		snapshotDocumentType: string | null
		snapshotDocumentNumber: string | null
		snapshotFullName: string | null
		snapshotFrontImageUrl: string | null
		snapshotExpiresAt: Date | null
	} | null
}

function titleCaseFromToken(token: string): string {
	return token
		.split(/\s+|_/g)
		.filter(Boolean)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
}

function formatActTypeLabel(actType: string | null | undefined): string {
	if (!actType) return "Act type"
	const normalized = String(actType).trim()
	if (!normalized) return "Act type"
	return titleCaseFromToken(normalized)
}

function formatWorkflowLabel(workflow: string | null | undefined): string {
	const w = (workflow ?? "").trim().toUpperCase()
	if (!w) return "—"
	if (w === "REN") return "Remote Electronic Notarization"
	if (w === "IEN") return "In-person Electronic Notarization"
	return titleCaseFromToken(w)
}

function truncateFileName(fileName: string | null | undefined, maxLength = 20): string {
	if (!fileName) return "Untitled Document"
	if (fileName.length <= maxLength) return fileName

	const lastDot = fileName.lastIndexOf(".")
	if (lastDot > 0) {
		const nameWithoutExt = fileName.substring(0, lastDot)
		const ext = fileName.substring(lastDot)
		if (nameWithoutExt.length + ext.length <= maxLength) return fileName

		const truncatedName = `${nameWithoutExt.substring(0, maxLength - ext.length - 3)}...`
		return `${truncatedName}${ext}`
	}

	return `${fileName.substring(0, maxLength - 3)}...`
}

function sortByFromColumnId(columnId: string): SortBy | null {
	if (columnId === "registryNumber") return "registryNumber"
	if (columnId === "actType") return "actType"
	if (columnId === "executedAt") return "executedAt"
	if (columnId === "documentName") return "documentName"
	if (columnId === "workflow") return "workflow"
	return null
}

export interface NotarialRegistryDataGridProps {
	acts: NotarialActRow[]
	total: number
	totalPages: number
	page: number
	pageSize: number
	onPageChange: (page: number) => void
	onPageSizeChange: (size: number) => void
	sortBy: SortBy
	sortDir: SortDir
	onSortChange: (sortBy: SortBy, sortDir: SortDir) => void
	isLoading: boolean
	isFetching: boolean
	expandedActIds: Set<string>
	setExpandedActIds: Dispatch<SetStateAction<Set<string>>>
	onCopyNrid: (nrid: string) => void
	copiedNrid: string | null
	onViewDocument: (actId: string, documentName?: string) => void
	onDownloadDocument: (actId: string) => void
	onSyncToSupremeCourt: (actId: string) => void
	downloadingActId: string | null
	syncingActId: string | null
	renderExpandedRow: (act: NotarialActRow) => React.ReactNode
}

export function NotarialRegistryDataGrid({
	acts,
	total,
	totalPages,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	sortBy,
	sortDir,
	onSortChange,
	isLoading,
	isFetching,
	expandedActIds,
	setExpandedActIds,
	onCopyNrid,
	copiedNrid,
	onViewDocument,
	onDownloadDocument,
	onSyncToSupremeCourt,
	downloadingActId,
	syncingActId,
	renderExpandedRow,
}: NotarialRegistryDataGridProps) {
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const pagination: PaginationState = useMemo(
		() => ({
			pageIndex: Math.max(0, page - 1),
			pageSize,
		}),
		[page, pageSize]
	)

	const sorting: SortingState = useMemo(
		() => [{ id: sortBy, desc: sortDir === "desc" }],
		[sortBy, sortDir]
	)

	const expandRowBy = useCallback(
		(act: NotarialActRow) => expandedActIds.has(act.id),
		[expandedActIds]
	)

	const toggleActExpanded = useCallback(
		(actId: string) => {
			setExpandedActIds(prev => {
				const next = new Set(prev)
				if (next.has(actId)) next.delete(actId)
				else next.add(actId)
				return next
			})
		},
		[setExpandedActIds]
	)

	const onPaginationChange = useCallback(
		(updater: Parameters<typeof functionalUpdate<PaginationState>>[0]) => {
			const next = functionalUpdate(updater, pagination)
			if (next.pageSize !== pagination.pageSize) {
				onPageSizeChange(next.pageSize)
				if (next.pageIndex !== 0) onPageChange(1)
				return
			}
			if (next.pageIndex !== pagination.pageIndex) {
				onPageChange(next.pageIndex + 1)
			}
		},
		[pagination, onPageChange, onPageSizeChange]
	)

	const onSortingChange = useCallback(
		(updater: Parameters<typeof functionalUpdate<SortingState>>[0]) => {
			const next = functionalUpdate(updater, sorting)
			const first = next[0]
			if (!first) return
			const mapped = sortByFromColumnId(first.id)
			if (!mapped) return
			onSortChange(mapped, first.desc ? "desc" : "asc")
			onPageChange(1)
		},
		[sorting, onSortChange, onPageChange]
	)

	const columns = useMemo<ColumnDef<NotarialActRow>[]>(
		() => [
			{
				accessorKey: "registryNumber",
				id: "registryNumber",
				header: "#",
				cell: ({ row }) => (
					<span className="font-mono text-xs font-medium">
						{row.original.registryNumber ?? "—"}
					</span>
				),
				size: 56,
				enableSorting: true,
				meta: {
					expandedContent: (act: NotarialActRow) => renderExpandedRow(act),
					cellClassName: "align-top",
				},
			},
			{
				id: "supremeCourtRegistryId",
				header: "NRID",
				accessorFn: row => row.supremeCourtRegistryId ?? "",
				cell: ({ row }) => {
					const act = row.original
					return act.supremeCourtRegistryId ? (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1">
										<Hash className="text-muted-foreground size-3.5" />
										<Button
											variant="ghost"
											size="sm"
											className="h-6 px-0.5 text-xs"
											onClick={() => onCopyNrid(act.supremeCourtRegistryId!)}
										>
											{copiedNrid === act.supremeCourtRegistryId ? (
												<span className="text-xs text-green-600 dark:text-green-400">COPIED</span>
											) : (
												<Copy className="size-3" />
											)}
										</Button>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="font-mono text-xs">{act.supremeCourtRegistryId}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					) : (
						<span className="text-muted-foreground text-xs">—</span>
					)
				},
				size: 72,
				enableSorting: false,
				meta: { cellClassName: "align-top" },
			},
			{
				accessorKey: "actType",
				id: "actType",
				header: "Act type",
				cell: ({ row }) => (
					<p className="truncate text-xs font-medium">{formatActTypeLabel(row.original.actType)}</p>
				),
				size: 112,
				enableSorting: true,
				meta: { cellClassName: "min-w-0 align-top" },
			},
			{
				accessorKey: "executedAt",
				id: "executedAt",
				header: "Date & time",
				cell: ({ row }) => (
					<div className="text-xs leading-tight">
						<div className="font-medium">
							{format(new Date(row.original.executedAt), "MMM dd, yyyy")}
						</div>
						<div className="text-muted-foreground">
							{format(new Date(row.original.executedAt), "hh:mm a")}
						</div>
					</div>
				),
				size: 128,
				enableSorting: true,
				meta: { cellClassName: "align-top" },
			},
			{
				accessorKey: "documentName",
				id: "documentName",
				header: "Title / description",
				cell: ({ row }) => {
					const act = row.original
					return (
						<div className="min-w-0">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<p className="cursor-help truncate text-xs font-medium">
											{truncateFileName(act.documentName, 32)}
										</p>
									</TooltipTrigger>
									{act.documentName && act.documentName.length > 32 && (
										<TooltipContent className="max-w-xs">
											<p className="wrap-break-word">{act.documentName}</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
							{act.documentDescription ? (
								<p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
									{act.documentDescription}
								</p>
							) : null}
						</div>
					)
				},
				size: 220,
				enableSorting: true,
				meta: { cellClassName: "min-w-0 align-top" },
			},
			{
				id: "fees",
				header: "Fee",
				accessorFn: row => row.fees ?? null,
				cell: ({ row }) => {
					const f = row.original.fees
					return f !== null && f !== undefined && typeof f === "number" && !Number.isNaN(f) ? (
						<span className="text-xs font-medium">₱ {f.toFixed(2)}</span>
					) : (
						<span className="text-muted-foreground text-xs">—</span>
					)
				},
				size: 88,
				enableSorting: false,
				meta: { cellClassName: "align-top pl-1 text-left" },
			},
			{
				accessorKey: "workflow",
				id: "workflow",
				header: "Notarization",
				cell: ({ row }) => (
					<p className="text-xs leading-snug font-medium break-words whitespace-normal">
						{formatWorkflowLabel(row.original.workflow)}
					</p>
				),
				size: 160,
				enableSorting: true,
				meta: { cellClassName: "align-top" },
			},
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				cell: ({ row }) => {
					const act = row.original
					const isOpen = expandedActIds.has(act.id)
					return (
						<div className="inline-flex w-full items-center justify-end gap-1">
							{(act.documentId ?? act.docoChainProjectUuid) && (
								<Button
									variant="ghost"
									size="sm"
									className="size-7 p-0"
									onClick={() => onViewDocument(act.id, act.documentName ?? undefined)}
									aria-label="View document"
									title="View Document"
								>
									<Eye className="size-4" />
								</Button>
							)}
							{act.docoChainProjectUuid && (
								<Button
									variant="ghost"
									size="sm"
									className="size-7 p-0"
									disabled={downloadingActId === act.id}
									onClick={() => onDownloadDocument(act.id)}
									aria-label="Download notarized document"
									title={
										downloadingActId === act.id ? "Downloading..." : "Download notarized document"
									}
								>
									{downloadingActId === act.id ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Download className="size-4" />
									)}
								</Button>
							)}
							{act.docoChainProjectUuid && (
								<Button
									variant="ghost"
									size="sm"
									className="size-7 p-0"
									disabled
									aria-label="View certificate"
									title="Temporarily unavailable while signing integration is rebuilt"
								>
									<FileCheck className="size-4" />
								</Button>
							)}
							{!act.syncedToSupremeCourt && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="size-7 p-0"
											disabled={syncingActId === act.id}
											onClick={() => onSyncToSupremeCourt(act.id)}
											aria-label="Sync to Supreme Court"
											title={syncingActId === act.id ? "Syncing..." : "Sync to Supreme Court"}
										>
											{syncingActId === act.id ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<CloudUpload className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>Sync this act to Supreme Court</p>
									</TooltipContent>
								</Tooltip>
							)}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="size-7 p-0"
								onClick={e => {
									e.preventDefault()
									e.stopPropagation()
									if (!act.id) return
									toggleActExpanded(act.id)
								}}
								aria-label={isOpen ? "Collapse details" : "Expand details"}
								title={isOpen ? "Collapse details" : "Expand details"}
								aria-expanded={isOpen}
							>
								{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
							</Button>
						</div>
					)
				},
				size: 160,
				enableSorting: false,
				meta: { cellClassName: "align-top" },
			},
		],
		[
			renderExpandedRow,
			onCopyNrid,
			copiedNrid,
			onViewDocument,
			onDownloadDocument,
			onSyncToSupremeCourt,
			downloadingActId,
			syncingActId,
			expandedActIds,
			toggleActExpanded,
		]
	)

	const table = useReactTable({
		data: acts,
		columns,
		pageCount: Math.max(1, totalPages || 1),
		rowCount: total,
		getRowId: row => row.id,
		state: {
			pagination,
			sorting,
			columnOrder,
		},
		onPaginationChange,
		onSortingChange,
		onColumnOrderChange: setColumnOrder,
		manualPagination: true,
		manualSorting: true,
		getCoreRowModel: getCoreRowModel(),
		enableSortingRemoval: false,
	})

	return (
		<DataGrid
			table={table}
			recordCount={total}
			isLoading={isLoading}
			expandRowBy={expandRowBy}
			tableLayout={{
				cellBorder: true,
			}}
		>
			<div className="w-full min-w-0 space-y-2.5">
				<DataGridContainer className={isFetching && !isLoading ? "opacity-80" : undefined}>
					<DataGridScrollArea>
						<DataGridTable />
					</DataGridScrollArea>
				</DataGridContainer>
				{totalPages > 1 || total > 0 ? <DataGridPagination /> : null}
			</div>
		</DataGrid>
	)
}
