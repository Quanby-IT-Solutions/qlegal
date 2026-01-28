"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { motion } from "motion/react"
import { format } from "date-fns"
import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	Download,
	Eye,
	FileCheck,
	FileText,
	IdCard,
	Info,
	LayoutGrid,
	List,
	RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"

import { trpc } from "@/services/trpc/client"

import { NotarialActDocumentDialog2 } from "@/features/notarial-book/components/notarial-act-document-dialog-2"
import { PrincipalIdDialog } from "@/features/notarial-book/components/principal-id-dialog"

type ActTypeFilter =
	| "ALL"
	| "ACKNOWLEDGMENT"
	| "AFFIRMATION"
	| "JURAT"
	| "SIGNATURE_WITNESSING"

type ViewMode = "table" | "cards"

// Helper function to truncate file names intelligently
function truncateFileName(fileName: string | null | undefined, maxLength = 20): string {
	if (!fileName) return "Untitled Document"
	if (fileName.length <= maxLength) return fileName

	// Try to preserve extension
	const lastDot = fileName.lastIndexOf(".")
	if (lastDot > 0) {
		const nameWithoutExt = fileName.substring(0, lastDot)
		const ext = fileName.substring(lastDot)
		if (nameWithoutExt.length + ext.length <= maxLength) return fileName

		// Truncate name part, keep extension
		const truncatedName = `${nameWithoutExt.substring(0, maxLength - ext.length - 3)}...`
		return `${truncatedName}${ext}`
	}

	// No extension, just truncate
	return `${fileName.substring(0, maxLength - 3)}...`
}

interface NotarialActRow {
	id: string
	executedAt: Date | string
	actType: string
	workflow: string
	principalName: string
	principalIdNumber?: string | null
	principalIdImageBase64?: string | null
	principalIdType?: string | null
	locationStatement?: string | null
	witnessName?: string | null
	documentName?: string | null
	documentDescription?: string | null
	location?: string | null
	certificateNumber?: string | null
	documentId?: string | null
	docoChainProjectUuid?: string | null
	fees?: number | null
}

function NotarialActCard({
	act,
	entryIndex,
	onViewDocument,
	onViewCertificate,
	onViewPrincipalId,
}: {
	act: NotarialActRow
	entryIndex: number
	onViewDocument: (actId: string, documentName?: string) => void
	onViewCertificate: (actId: string) => void
	onViewPrincipalId: (principalName: string, principalIdImageBase64: string | null | undefined) => void
}) {
	return (
		<Card className="flex flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="font-mono text-sm text-muted-foreground">#{entryIndex}</span>
					<div className="flex gap-1">
						<Badge variant="outline" className="text-xs">
							{act.actType}
						</Badge>
						<Badge variant={act.workflow === "REN" ? "default" : "secondary"} className="text-xs">
							{act.workflow}
						</Badge>
					</div>
				</div>
				<CardTitle className="line-clamp-1 text-base">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="block truncate">
									{truncateFileName(act.documentName, 25)}
								</span>
							</TooltipTrigger>
							{act.documentName && act.documentName.length > 25 && (
								<TooltipContent>
									<p className="max-w-xs break-words">{act.documentName}</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				</CardTitle>
				{act.documentDescription && (
					<CardDescription className="line-clamp-2 text-xs">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="block line-clamp-2">
										{act.documentDescription}
									</span>
								</TooltipTrigger>
								{act.documentDescription.length > 50 && (
									<TooltipContent>
										<p className="max-w-xs break-words">{act.documentDescription}</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3 pt-0">
				<div className="space-y-1 text-sm">
					<div className="flex items-center gap-1">
						<p className="font-medium">{act.principalName}</p>
						{act.locationStatement && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="text-muted-foreground size-3.5 shrink-0 cursor-help" aria-label="View certification statement" />
									</TooltipTrigger>
									<TooltipContent className="max-w-md">
										<p className="text-sm">{act.locationStatement}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
					{/* {act.principalIdType ? (
						<p className="text-muted-foreground text-xs">{act.principalIdType}</p>
					) : null} */}
					{act.principalIdNumber && (
						<p className="text-muted-foreground text-xs">ID: {act.principalIdNumber}</p>
					)}
					{act.witnessName && (
						<p className="text-muted-foreground text-xs">Witness: {act.witnessName}</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>{format(new Date(act.executedAt), "MMM dd, yyyy · hh:mm a")}</span>
					<span>·</span>
					<span>{act.location ?? "Philippines"}</span>
					{act.certificateNumber && (
						<>
							<span>·</span>
							<span className="font-mono">{act.certificateNumber}</span>
						</>
					)}
					{act.fees !== null &&
						act.fees !== undefined &&
						typeof act.fees === "number" &&
						!Number.isNaN(act.fees) && (
							<>
								<span>·</span>
								<span className="font-semibold">Fees: {act.fees.toFixed(2)}</span>
							</>
						)}
				</div>
				<div className="mt-auto flex flex-wrap gap-2 pt-2">
					{act.principalIdImageBase64 && (
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onViewPrincipalId(act.principalName, act.principalIdImageBase64)}
						>
							<IdCard className="mr-1.5 size-3.5" />
							View ID
						</Button>
					)}
					{(act.documentId ?? act.docoChainProjectUuid) && (
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onViewDocument(act.id, act.documentName ?? undefined)}
						>
							<Eye className="mr-1.5 size-3.5" />
							Document
						</Button>
					)}
					{act.docoChainProjectUuid && (
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => onViewCertificate(act.id)}
						>
							<FileCheck className="mr-1.5 size-3.5" />
							Certificate
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

export default function NotarialBook2Page() {
	const [searchTerm, setSearchTerm] = useState("")
	const [actTypeFilter, setActTypeFilter] = useState<ActTypeFilter>("ALL")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [page, setPage] = useState(1)
	const [viewMode, setViewMode] = useState<ViewMode>("cards")
	const perPage = 50

	// Document preview state - matches qsign-lite pattern
	const [previewDocument, setPreviewDocument] = useState<{
		actId: string
		documentName: string
	} | null>(null)

	const [previewPrincipalId, setPreviewPrincipalId] = useState<{
		principalName: string
		principalIdImageBase64: string | null | undefined
	} | null>(null)

	const [expandedActIds, setExpandedActIds] = useState<Set<string>>(new Set())
	const toggleExpanded = useCallback((actId: string) => {
		setExpandedActIds(prev => {
			const next = new Set(prev)
			if (next.has(actId)) next.delete(actId)
			else next.add(actId)
			return next
		})
	}, [])

	// Fetch notarial book entries directly from DocoChain API (no sync required)
	const {
		data: notarialBookData,
		isLoading,
		isFetching,
		refetch,
	} = trpc.notarialBook.getNotarialBookFromAPI.useQuery({
		page,
		perPage,
		search: searchTerm || undefined,
		actType: actTypeFilter,
		workflow: workflowFilter,
	})

	// Export mutation (placeholder - can be enhanced to export from API data)
	const exportMutation = trpc.notarialBook.exportNotarialBook.useMutation({
		onSuccess: () => {
			toast.success("Notarial book export generated successfully")
		},
		onError: error => {
			toast.error(`Failed to export: ${error.message}`)
		},
	})

	const filteredActs = useMemo(() => {
		// Search is already handled by the API endpoint
		return notarialBookData?.acts ?? []
	}, [notarialBookData?.acts])

	const handleExport = () => {
		exportMutation.mutate()
	}

	const handleRefresh = async () => {
		try {
			const result = await refetch()
			if (result.error) {
				toast.error("Failed to refresh registry")
			} else {
				toast.success("Registry refreshed")
			}
		} catch {
			toast.error("Failed to refresh registry")
		}
	}

	// View button handler - matches qsign-lite pattern (simple state update)
	const handleViewDocument = (actId: string, documentName?: string) => {
		setPreviewDocument({
			actId,
			documentName: documentName ?? "document.pdf",
		})
	}

	// View principal ID handler
	const handleViewPrincipalId = (principalName: string, principalIdImageBase64: string | null | undefined) => {
		setPreviewPrincipalId({
			principalName,
			principalIdImageBase64,
		})
	}

	// Certificate viewing
	const utils = trpc.useUtils()

	const handleViewCertificate = async (actId: string) => {
		try {
			const result = await utils.notarialBook.getCertificateUrl.fetch({ actId })
			if (result?.url) {
				window.open(result.url, "_blank")
			} else {
				toast.error("Certificate URL not available")
			}
		} catch (error) {
			toast.error(
				`Failed to get certificate: ${error instanceof Error ? error.message : "Unknown error"}`
			)
		}
	}

	return (
		<>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Notarial Book 2" }]} />

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{/* Header */}
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
									<BookOpen className="size-8" />
									Notarial Registry
								</h1>
								<p className="text-muted-foreground mt-2 max-w-2xl">
									Official register of notarial acts. Search and filter by act type or workflow,
									view documents and certificates, and export records.
								</p>
							</div>
							<div className="flex shrink-0 gap-2">
								<Button
									onClick={() => void handleRefresh()}
									variant="outline"
									disabled={isLoading || isFetching}
								>
									<RefreshCw
										className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
									/>
									{isFetching ? "Refreshing..." : "Refresh"}
								</Button>
								<Button
									onClick={handleExport}
									variant="outline"
									disabled={exportMutation.isPending}
								>
									<Download className="mr-2 size-4" />
									Export Records
								</Button>
							</div>
						</div>

						{/* Act type tabs (swappable notarization view) + Filters */}
						<Card className="mb-8">
							<CardContent className="pt-6">
								<Tabs
									value={actTypeFilter}
									onValueChange={v => {
										setActTypeFilter(v as ActTypeFilter)
										setPage(1)
									}}
								>
									<div className="mb-4">
										<TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
											<TabsTrigger value="ALL" className="text-sm">
												All
											</TabsTrigger>
											<TabsTrigger value="ACKNOWLEDGMENT" className="text-sm">
												Acknowledgment
											</TabsTrigger>
											<TabsTrigger value="AFFIRMATION" className="text-sm">
												Affirmation
											</TabsTrigger>
											<TabsTrigger value="JURAT" className="text-sm">
												Jurat
											</TabsTrigger>
											<TabsTrigger value="SIGNATURE_WITNESSING" className="text-sm">
												Signature Witnessing
											</TabsTrigger>
										</TabsList>
									</div>
									<TabsContent value={actTypeFilter} className="mt-0">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											<Input
												placeholder="Search by principal, document, or certificate number..."
												value={searchTerm}
												onChange={e => {
													setSearchTerm(e.target.value)
													setPage(1)
												}}
											/>
											<Select
												value={workflowFilter}
												onValueChange={value => {
													setWorkflowFilter(value as "ALL" | "REN" | "IEN")
													setPage(1)
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="All Workflows" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="ALL">All Workflows</SelectItem>
													<SelectItem value="REN">REN</SelectItem>
													<SelectItem value="IEN">IEN</SelectItem>
												</SelectContent>
											</Select>
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground text-sm">View:</span>
												<ToggleGroup
													type="single"
													value={viewMode}
													onValueChange={v => v && setViewMode(v as ViewMode)}
												>
													<ToggleGroupItem value="table" aria-label="Table view">
														<List className="size-4" />
													</ToggleGroupItem>
													<ToggleGroupItem value="cards" aria-label="Cards view">
														<LayoutGrid className="size-4" />
													</ToggleGroupItem>
												</ToggleGroup>
											</div>
										</div>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>

						{/* Notarial Acts Table */}
						<Card>
							<CardHeader>
								<CardTitle>Notarial Acts Register</CardTitle>
								<CardDescription>
									{isLoading ? (
										<Skeleton className="h-4 w-32" />
									) : (
										<>
											{notarialBookData?.total ?? 0} notarial act
											{(notarialBookData?.total ?? 0) !== 1 ? "s" : ""} recorded
											{notarialBookData && notarialBookData.totalPages > 1 && (
												<span className="ml-2">
													(Page {page} of {notarialBookData.totalPages})
												</span>
											)}
										</>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="space-y-4">
										{Array.from({ length: 5 }).map((_, i) => (
											<Skeleton key={i} className="h-16 w-full" />
										))}
									</div>
								) : filteredActs.length === 0 ? (
									<div className="py-12 text-center">
										<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
										<h3 className="mb-2 text-lg font-medium">No notarial acts found</h3>
										<p className="text-muted-foreground mb-4">
											{searchTerm || actTypeFilter !== "ALL" || workflowFilter !== "ALL"
												? "Try adjusting your search criteria or filters."
												: "No completed notarial acts in the register yet."}
										</p>
									</div>
								) : viewMode === "cards" ? (
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
										{filteredActs.map((act, index) => (
											<NotarialActCard
												key={act.id}
												act={act}
												entryIndex={(page - 1) * perPage + index + 1}
												onViewDocument={handleViewDocument}
												onViewCertificate={handleViewCertificate}
												onViewPrincipalId={handleViewPrincipalId}
											/>
										))}
									</div>
								) : (
									<div className="overflow-x-auto -mx-4 sm:mx-0">
										<div className="min-w-full inline-block align-middle">
											<Table className="w-full">
												<TableHeader>
													<TableRow>
														<TableHead className="w-10 sm:w-12">#</TableHead>
														<TableHead className="min-w-[100px] sm:min-w-[110px]">Date & Time</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[140px]">Principal</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[160px]">Document</TableHead>
														<TableHead className="w-24 sm:w-28">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredActs.map((act, index) => {
														const isExpanded = expandedActIds.has(act.id)
														return (
															<Fragment key={act.id}>
																<TableRow className={isExpanded ? "border-b-0" : undefined}>
																	<TableCell className="font-mono font-medium text-xs sm:text-sm align-top">
																		{(page - 1) * perPage + index + 1}
																	</TableCell>
																	<TableCell className="whitespace-nowrap align-top">
																		<span className="text-xs sm:text-sm">
																			{format(new Date(act.executedAt), "MMM dd, yyyy")}
																		</span>
																		<br />
																		<span className="text-muted-foreground text-xs">
																			{format(new Date(act.executedAt), "hh:mm a")}
																		</span>
																	</TableCell>
																	<TableCell className="min-w-0 align-top">
																		<div className="flex items-center gap-1">
																			<p className="font-medium text-xs sm:text-sm truncate">{act.principalName}</p>
																			{act.locationStatement && (
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<Info className="text-muted-foreground size-3.5 shrink-0 cursor-help" aria-label="View certification statement" />
																						</TooltipTrigger>
																						<TooltipContent className="max-w-md">
																							<p className="text-sm">{act.locationStatement}</p>
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			)}
																		</div>
																	</TableCell>
																	<TableCell className="min-w-0 max-w-[140px] sm:max-w-[200px] align-top">
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<p className="truncate text-xs sm:text-sm font-medium cursor-help">
																						{truncateFileName(act.documentName, 24)}
																					</p>
																				</TooltipTrigger>
																				{act.documentName && act.documentName.length > 24 && (
																					<TooltipContent className="max-w-xs">
																						<p className="break-words">{act.documentName}</p>
																					</TooltipContent>
																				)}
																			</Tooltip>
																		</TooltipProvider>
																	</TableCell>
																	<TableCell className="align-top">
																		<div className="flex items-center justify-end gap-0.5 sm:gap-1">
																			{(act as NotarialActRow).principalIdImageBase64 && (
																				<Button
																					variant="ghost"
																					size="sm"
																					className="size-7 sm:size-8 p-0"
																					onClick={() =>
																						handleViewPrincipalId(act.principalName, (act as NotarialActRow).principalIdImageBase64)
																					}
																					title="View Principal ID"
																				>
																					<IdCard className="size-3.5 sm:size-4" />
																				</Button>
																			)}
																			{(act.documentId ?? act.docoChainProjectUuid) && (
																				<Button
																					variant="ghost"
																					size="sm"
																					className="size-7 sm:size-8 p-0"
																					onClick={() =>
																						handleViewDocument(act.id, act.documentName ?? undefined)
																					}
																					title="View Document"
																				>
																					<Eye className="size-3.5 sm:size-4" />
																				</Button>
																			)}
																			{act.docoChainProjectUuid && (
																				<Button
																					variant="ghost"
																					size="sm"
																					className="size-7 sm:size-8 p-0"
																					onClick={() => handleViewCertificate(act.id)}
																					title="View Certificate"
																				>
																					<FileCheck className="size-3.5 sm:size-4" />
																				</Button>
																			)}
																			<Button
																				variant="ghost"
																				size="sm"
																				className="size-7 sm:size-8 p-0"
																				onClick={() => toggleExpanded(act.id)}
																				title={isExpanded ? "Collapse details" : "Expand details"}
																				aria-expanded={isExpanded}
																			>
																				{isExpanded ? (
																					<ChevronDown className="size-4" />
																				) : (
																					<ChevronRight className="size-4" />
																				)}
																			</Button>
																		</div>
																	</TableCell>
																</TableRow>
																<TableRow
																	className="bg-muted/30 hover:bg-muted/30"
																	aria-hidden={!isExpanded}
																>
																		<TableCell colSpan={5} className="p-0 align-top">
																			<motion.div
																				animate={{
																					height: isExpanded ? "auto" : 0,
																					opacity: isExpanded ? 1 : 0,
																				}}
																				transition={{
																					type: "spring",
																					stiffness: 300,
																					damping: 30,
																					mass: 0.8,
																				}}
																				className="overflow-hidden"
																			>
																			<div className="space-y-2.5 px-4 py-3 text-xs leading-snug sm:px-6">
																				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
																					<span>
																						<span className="text-muted-foreground">Act type</span>{" "}
																						<Badge variant="outline" className="text-xs font-medium">
																							{act.actType}
																						</Badge>
																					</span>
																					<span className="text-muted-foreground">·</span>
																					<span>
																						<span className="text-muted-foreground">Workflow</span>{" "}
																						<Badge variant={act.workflow === "REN" ? "default" : "secondary"} className="text-xs font-medium">
																							{act.workflow}
																						</Badge>
																					</span>
																					<span className="text-muted-foreground">·</span>
																					<span>
																						<span className="text-muted-foreground">Location</span>{" "}
																						{act.location ?? "Philippines"}
																					</span>
																					<span className="text-muted-foreground">·</span>
																					<span>
																						<span className="text-muted-foreground">Certificate #</span>{" "}
																						<span className="font-mono">{act.certificateNumber ?? "—"}</span>
																					</span>
																					<span className="text-muted-foreground">·</span>
																					<span>
																						<span className="text-muted-foreground">Fees</span>{" "}
																						{act.fees != null && typeof act.fees === "number" && !Number.isNaN(act.fees)
																							? act.fees.toFixed(2)
																							: "—"}
																					</span>
																					{act.principalIdNumber && (
																						<>
																							<span className="text-muted-foreground">·</span>
																							<span>
																								<span className="text-muted-foreground">ID</span> {act.principalIdNumber}
																							</span>
																						</>
																					)}
																					{act.witnessName && (
																						<>
																							<span className="text-muted-foreground">·</span>
																							<span>
																								<span className="text-muted-foreground">Witness</span> {act.witnessName}
																							</span>
																						</>
																					)}
																				</div>
																				{act.documentDescription && (
																					<p className="text-foreground/90">
																						<span className="text-muted-foreground">Description:</span>{" "}
																						{act.documentDescription}
																					</p>
																				)}
																				{act.locationStatement && (
																					<div>
																						<span className="text-muted-foreground">Certification:</span>
																						<p className="mt-0.5 italic text-foreground/80">{act.locationStatement}</p>
																					</div>
																				)}
																			</div>
																			</motion.div>
																		</TableCell>
																	</TableRow>
															</Fragment>
														)
													})}
												</TableBody>
											</Table>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</div>

			{/* Document Preview Dialog - matches qsign-lite pattern */}
			{previewDocument && (
				<NotarialActDocumentDialog2
					isOpen={!!previewDocument}
					onClose={() => setPreviewDocument(null)}
					actId={previewDocument.actId}
					documentName={previewDocument.documentName}
				/>
			)}
			{previewPrincipalId && (
				<PrincipalIdDialog
					isOpen={!!previewPrincipalId}
					onClose={() => setPreviewPrincipalId(null)}
					principalName={previewPrincipalId.principalName}
					principalIdImageBase64={previewPrincipalId.principalIdImageBase64}
				/>
			)}
		</>
	)
}
