"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
	BookOpen,
	Download,
	Eye,
	FileCheck,
	FileText,
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
	witnessName?: string | null
	documentName?: string | null
	documentDescription?: string | null
	location?: string | null
	certificateNumber?: string | null
	documentId?: string | null
	docoChainProjectUuid?: string | null
}

function NotarialActCard({
	act,
	entryIndex,
	onViewDocument,
	onViewCertificate,
}: {
	act: NotarialActRow
	entryIndex: number
	onViewDocument: (actId: string, documentName?: string) => void
	onViewCertificate: (actId: string) => void
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
					<p className="font-medium">{act.principalName}</p>
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
				</div>
				{(act.documentId ?? act.docoChainProjectUuid) && (
					<div className="mt-auto flex gap-2 pt-2">
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
				)}
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
											/>
										))}
									</div>
								) : (
									<div className="overflow-x-auto -mx-4 sm:mx-0">
										<div className="min-w-full inline-block align-middle">
											<Table className="w-full">
												<TableHeader>
													<TableRow>
														<TableHead className="w-12 sm:w-16">#</TableHead>
														<TableHead className="min-w-[100px] sm:min-w-[120px]">Date & Time</TableHead>
														<TableHead className="hidden min-w-[90px] sm:table-cell">Act Type</TableHead>
														<TableHead className="hidden min-w-[70px] md:table-cell">Workflow</TableHead>
														<TableHead className="min-w-[140px] sm:min-w-[150px]">Principal</TableHead>
														<TableHead className="min-w-[160px] sm:min-w-[180px]">Document</TableHead>
														<TableHead className="hidden min-w-[90px] lg:table-cell">Location</TableHead>
														<TableHead className="hidden min-w-[110px] xl:table-cell">Certificate #</TableHead>
														<TableHead className="w-20 sm:w-24">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredActs.map((act, index) => (
														<TableRow key={act.id}>
															<TableCell className="font-mono font-medium text-xs sm:text-sm">
																{(page - 1) * perPage + index + 1}
															</TableCell>
															<TableCell className="whitespace-nowrap">
																<span className="text-xs sm:text-sm">
																	{format(new Date(act.executedAt), "MMM dd, yyyy")}
																</span>
																<br />
																<span className="text-muted-foreground text-xs">
																	{format(new Date(act.executedAt), "hh:mm a")}
																</span>
															</TableCell>
															<TableCell className="hidden sm:table-cell">
																<Badge variant="outline" className="text-xs whitespace-nowrap">
																	{act.actType}
																</Badge>
															</TableCell>
															<TableCell className="hidden md:table-cell">
																<Badge variant={act.workflow === "REN" ? "default" : "secondary"} className="text-xs whitespace-nowrap">
																	{act.workflow}
																</Badge>
															</TableCell>
															<TableCell>
																<div className="min-w-0">
																	<p className="font-medium text-xs sm:text-sm truncate">{act.principalName}</p>
																	{act.principalIdNumber && (
																		<p className="text-muted-foreground text-xs truncate">
																			ID: {act.principalIdNumber}
																		</p>
																	)}
																	{act.witnessName && (
																		<p className="text-muted-foreground mt-1 text-xs truncate">
																			Witness: {act.witnessName}
																		</p>
																	)}
																	{/* Show act type and workflow on mobile */}
																	<div className="mt-1 flex gap-1 sm:hidden">
																		<Badge variant="outline" className="text-xs">
																			{act.actType}
																		</Badge>
																		<Badge variant={act.workflow === "REN" ? "default" : "secondary"} className="text-xs">
																			{act.workflow}
																		</Badge>
																	</div>
																</div>
															</TableCell>
															<TableCell>
																<div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<p className="truncate text-xs sm:text-sm font-medium cursor-help">
																					{truncateFileName(act.documentName, 18)}
																				</p>
																			</TooltipTrigger>
																			{act.documentName && act.documentName.length > 18 && (
																				<TooltipContent className="max-w-xs">
																					<p className="break-words">{act.documentName}</p>
																				</TooltipContent>
																			)}
																		</Tooltip>
																	</TooltipProvider>
																	{act.documentDescription && (
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<p className="text-muted-foreground mt-1 truncate text-xs cursor-help">
																						{act.documentDescription.length > 20
																							? `${act.documentDescription.substring(0, 20)}...`
																							: act.documentDescription}
																					</p>
																				</TooltipTrigger>
																				{act.documentDescription.length > 20 && (
																					<TooltipContent className="max-w-xs">
																						<p className="break-words">{act.documentDescription}</p>
																					</TooltipContent>
																				)}
																			</Tooltip>
																		</TooltipProvider>
																	)}
																</div>
															</TableCell>
															<TableCell className="hidden lg:table-cell whitespace-nowrap">
																<span className="text-xs sm:text-sm">{act.location ?? "Philippines"}</span>
															</TableCell>
															<TableCell className="hidden xl:table-cell">
																<span className="font-mono text-xs sm:text-sm whitespace-nowrap">
																	{act.certificateNumber ?? "N/A"}
																</span>
															</TableCell>
															<TableCell>
																<div className="flex items-center gap-1">
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
																</div>
															</TableCell>
														</TableRow>
													))}
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
		</>
	)
}
