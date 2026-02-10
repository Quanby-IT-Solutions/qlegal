"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
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
	Loader2,
	RefreshCw,
	User,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
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

type ActTypeFilter = "ALL" | "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"

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
	meetingEndedAt?: Date | string | null
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
	onDownloadDocument,
	onViewCertificate,
	onViewPrincipalId,
	isDownloading,
}: {
	act: NotarialActRow
	entryIndex: number
	onViewDocument: (actId: string, documentName?: string) => void
	onDownloadDocument: (actId: string, documentName?: string) => void
	onViewCertificate: (actId: string) => void
	onViewPrincipalId: (
		principalName: string,
		principalIdImageBase64: string | null | undefined
	) => void
	isDownloading?: boolean
}) {
	return (
		<Card className="flex flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="text-muted-foreground font-mono text-sm">#{entryIndex}</span>
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
								<span className="block truncate">{truncateFileName(act.documentName, 25)}</span>
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
									<span className="line-clamp-2 block">{act.documentDescription}</span>
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
										<Info
											className="text-muted-foreground size-3.5 shrink-0 cursor-help"
											aria-label="View certification statement"
										/>
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
				<div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
					<span>
						<strong className="text-foreground">Signed:</strong>{" "}
						{format(new Date(act.executedAt), "MMM dd, yyyy · hh:mm a")}
					</span>
					{act.meetingEndedAt && (
						<span>
							<strong className="text-foreground">Meeting ended:</strong>{" "}
							{format(new Date(act.meetingEndedAt), "MMM dd, yyyy · hh:mm a")}
						</span>
					)}
				</div>
				<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
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
						<>
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => onViewDocument(act.id, act.documentName ?? undefined)}
							>
								<Eye className="mr-1.5 size-3.5" />
								Document
							</Button>
							{act.docoChainProjectUuid && (
								<Button
									variant="outline"
									size="sm"
									className="flex-1"
									disabled={isDownloading}
									onClick={() =>
										onDownloadDocument(act.id, act.documentName ?? undefined)
									}
								>
									{isDownloading ? (
										<Loader2 className="mr-1.5 size-3.5 animate-spin" />
									) : (
										<Download className="mr-1.5 size-3.5" />
									)}
									{isDownloading ? "Downloading..." : "Download"}
								</Button>
							)}
						</>
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

function ExpandedActDetails({
	act,
	isExpanded,
}: {
	act: NotarialActRow
	isExpanded: boolean
}) {
	const { data: signersData, isPending: isSignersLoading } =
		trpc.notarialBook.getActSigners.useQuery(
			{ actId: act.id },
			{ enabled: isExpanded && !!act.docoChainProjectUuid }
		)
	const signers = signersData?.signers ?? []
	const isSignerSigned = (s: { status?: string; signedAt?: string | null }) => {
		const statusUpper = (s.status ?? "").toUpperCase()
		return statusUpper === "SIGNED" || statusUpper === "COMPLETED" || !!s.signedAt
	}

	return (
		<div className="space-y-4">
			{/* Signatories section */}
			<div>
				<h4 className="mb-2 font-semibold text-sm">Signatories</h4>
				{isSignersLoading ? (
					<div className="flex items-center gap-2 py-2">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-muted-foreground text-sm">Loading signers...</span>
					</div>
				) : signers.length === 0 ? (
					<p className="text-muted-foreground py-2 text-sm">
						No signer data available for this document.
					</p>
				) : (
					<div className="space-y-2">
						{signers.map(signer => {
							const fullName = [signer.firstName, signer.lastName]
								.filter(Boolean)
								.join(" ")
								.trim()
							const displayName = fullName || signer.email || "Unknown"
							const signed = isSignerSigned(signer)
							return (
								<div
									key={signer.id}
									className="bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2"
								>
									<div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
										<User className="text-muted-foreground size-4" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-medium">{displayName}</p>
										<p className="text-muted-foreground truncate text-xs">
											{signer.email}
											{signer.signedAt &&
												!Number.isNaN(new Date(signer.signedAt).getTime()) && (
													<>
														{" "}
														·{" "}
														<span className="font-medium">Signed:</span>{" "}
														{format(
															new Date(signer.signedAt),
															"MMM dd, yyyy · hh:mm a"
														)}
													</>
												)}
										</p>
									</div>
									<Badge
										variant={signed ? "default" : "secondary"}
										className={
											signed
												? "bg-green-600 text-xs dark:bg-green-700"
												: "text-xs"
										}
									>
										{signed ? "Signed" : signer.status ?? "Pending"}
									</Badge>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Act metadata row */}
			<div className="text-muted-foreground flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-t pt-3 text-xs">
				<span>
					<span className="font-medium">Act type</span>{" "}
					<Badge variant="outline" className="text-xs font-medium">
						{act.actType}
					</Badge>
				</span>
				<span>·</span>
				<span>
					<span className="font-medium">Workflow</span>{" "}
					<Badge
						variant={act.workflow === "REN" ? "default" : "secondary"}
						className="text-xs font-medium"
					>
						{act.workflow}
					</Badge>
				</span>
				<span>·</span>
				<span>
					<span className="font-medium">Location</span> {act.location ?? "Philippines"}
				</span>
				<span>·</span>
				<span>
					<span className="font-medium">Certificate #</span>{" "}
					<span className="font-mono">{act.certificateNumber ?? "—"}</span>
				</span>
				{act.fees != null &&
					typeof act.fees === "number" &&
					!Number.isNaN(act.fees) && (
						<>
							<span>·</span>
							<span>
								<span className="font-medium">Fees</span> {act.fees.toFixed(2)}
							</span>
						</>
					)}
			</div>
			{act.documentDescription && (
				<div className="text-xs">
					<span className="text-muted-foreground font-medium">Description:</span>{" "}
					{act.documentDescription}
				</div>
			)}
			{act.locationStatement && (
				<div className="text-xs">
					<span className="text-muted-foreground font-medium">Certification:</span>
					<p className="text-foreground/90 mt-0.5 italic">{act.locationStatement}</p>
				</div>
			)}
		</div>
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

	// Only show DB notarial acts so entries appear only after "End Session" has been clicked.
	// (DocoChain API returns "processing completed" when signing is done, which would show entries before End Session.)
	const dbQuery = trpc.notarialBook.getNotarialBook.useQuery({
		page,
		perPage,
		search: searchTerm.trim() || undefined,
		actType: actTypeFilter,
		workflow: workflowFilter,
	})

	const notarialBookData = dbQuery.data
	const isLoading = dbQuery.isLoading
	const isFetching = dbQuery.isFetching
	const refetch = useCallback(async () => {
		await dbQuery.refetch()
	}, [dbQuery])

	// Export mutation (placeholder - can be enhanced to export from API data)
	const exportMutation = trpc.notarialBook.exportNotarialBook.useMutation({
		onSuccess: () => {
			toast.success("Notarial book export generated successfully")
		},
		onError: error => {
			toast.error(`Failed to export: ${error.message}`)
		},
	})

	const filteredActs = useMemo((): NotarialActRow[] => {
		const acts = (notarialBookData?.acts ?? []) as NotarialActRow[]
		return [...acts].sort((a, b) => {
			const dateA = new Date(a.executedAt).getTime()
			const dateB = new Date(b.executedAt).getTime()
			return dateB - dateA
		})
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

	// Download notarized document - fetch then trigger download, with loading state
	const [downloadingActId, setDownloadingActId] = useState<string | null>(null)
	const handleDownloadDocument = useCallback(
		async (actId: string) => {
			setDownloadingActId(actId)
			try {
				const url = `/api/notarial-book-2/documents/${actId}?download=1`
				const res = await fetch(url, { credentials: "include" })
				if (!res.ok) {
					const text = await res.text()
					throw new Error(text || `Download failed (${res.status})`)
				}
				const blob = await res.blob()
				const contentDisposition = res.headers.get("Content-Disposition")
				const fileNameMatch = contentDisposition?.match(/filename="?([^";\n]+)"?/)
				const fileName = fileNameMatch?.[1] ?? "document.pdf"
				const blobUrl = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = blobUrl
				a.download = fileName
				a.style.display = "none"
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(blobUrl)
			} catch (error) {
				toast.error(
					`Failed to download: ${error instanceof Error ? error.message : "Unknown error"}`
				)
			} finally {
				setDownloadingActId(null)
			}
		},
		[]
	)

	// View principal ID handler
	const handleViewPrincipalId = (
		principalName: string,
		principalIdImageBase64: string | null | undefined
	) => {
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
									<RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
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
										<TabsList className="bg-muted/50 flex h-auto flex-wrap gap-1 p-1">
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
								) : (
									<AnimatePresence mode="wait">
										{viewMode === "cards" ? (
											<motion.div
												key="cards"
												initial="hidden"
												animate="visible"
												exit="hidden"
												variants={{
													visible: { transition: { staggerChildren: 0.05 } },
													hidden: {},
												}}
												className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
											>
												{filteredActs.map((act, index) => (
													<motion.div
														key={act.id}
														variants={{
															visible: { opacity: 1, y: 0 },
															hidden: { opacity: 0, y: 12 },
														}}
														transition={{ duration: 0.25 }}
													>
														<NotarialActCard
															act={act}
															entryIndex={(page - 1) * perPage + index + 1}
															onViewDocument={handleViewDocument}
															onDownloadDocument={handleDownloadDocument}
															onViewCertificate={handleViewCertificate}
															onViewPrincipalId={handleViewPrincipalId}
															isDownloading={downloadingActId === act.id}
														/>
													</motion.div>
												))}
											</motion.div>
										) : (
											<motion.div
												key="table"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.2 }}
												className="-mx-4 overflow-x-auto sm:mx-0"
											>
										<div className="inline-block min-w-full align-middle">
											<Table className="w-full">
												<TableHeader>
													<TableRow>
														<TableHead className="w-10 sm:w-12">#</TableHead>
														<TableHead className="min-w-[100px] sm:min-w-[110px]">
															Date & Time
														</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[140px]">
															Principal
														</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[160px]">
															Document
														</TableHead>
														<TableHead className="w-24 sm:w-28">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredActs.map((act, index) => {
														const isExpanded = expandedActIds.has(act.id)
														return (
															<Fragment key={act.id}>
																<TableRow className={isExpanded ? "border-b-0" : undefined}>
																	<TableCell className="align-top font-mono text-xs font-medium sm:text-sm">
																		{(page - 1) * perPage + index + 1}
																	</TableCell>
																	<TableCell className="align-top whitespace-nowrap">
																		<div className="text-xs sm:text-sm">
																			<div>
																				<span className="font-medium">Signed:</span>{" "}
																				{format(new Date(act.executedAt), "MMM dd, yyyy · hh:mm a")}
																			</div>
																			{act.meetingEndedAt && (
																				<div className="text-muted-foreground mt-0.5">
																					<span className="font-medium">Meeting ended:</span>{" "}
																					{format(new Date(act.meetingEndedAt), "MMM dd, yyyy · hh:mm a")}
																				</div>
																			)}
																		</div>
																	</TableCell>
																	<TableCell className="min-w-0 align-top">
																		<div className="flex items-center gap-1">
																			<p className="truncate text-xs font-medium sm:text-sm">
																				{act.principalName}
																			</p>
																			{act.locationStatement && (
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<Info
																								className="text-muted-foreground size-3.5 shrink-0 cursor-help"
																								aria-label="View certification statement"
																							/>
																						</TooltipTrigger>
																						<TooltipContent className="max-w-md">
																							<p className="text-sm">{act.locationStatement}</p>
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			)}
																		</div>
																	</TableCell>
																	<TableCell className="max-w-[140px] min-w-0 align-top sm:max-w-[200px]">
																		<TooltipProvider>
																			<Tooltip>
																				<TooltipTrigger asChild>
																					<p className="cursor-help truncate text-xs font-medium sm:text-sm">
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
																					className="size-7 p-0 sm:size-8"
																					onClick={() =>
																						handleViewPrincipalId(
																							act.principalName,
																							(act as NotarialActRow).principalIdImageBase64
																						)
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
																					className="size-7 p-0 sm:size-8"
																					onClick={() =>
																						handleViewDocument(
																							act.id,
																							act.documentName ?? undefined
																						)
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
																					className="size-7 p-0 sm:size-8"
																					disabled={downloadingActId === act.id}
																					onClick={() => handleDownloadDocument(act.id)}
																					title={
																						downloadingActId === act.id
																							? "Downloading..."
																							: "Download notarized document"
																					}
																				>
																					{downloadingActId === act.id ? (
																						<Loader2 className="size-3.5 animate-spin sm:size-4" />
																					) : (
																						<Download className="size-3.5 sm:size-4" />
																					)}
																				</Button>
																			)}
																			{act.docoChainProjectUuid && (
																				<Button
																					variant="ghost"
																					size="sm"
																					className="size-7 p-0 sm:size-8"
																					onClick={() => handleViewCertificate(act.id)}
																					title="View Certificate"
																				>
																					<FileCheck className="size-3.5 sm:size-4" />
																				</Button>
																			)}
																			<Button
																				variant="ghost"
																				size="sm"
																				className="size-7 p-0 sm:size-8"
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
																			<div className="px-4 py-3 sm:px-6">
																				<ExpandedActDetails
																					act={act as NotarialActRow}
																					isExpanded={isExpanded}
																				/>
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
											</motion.div>
										)}
									</AnimatePresence>
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
