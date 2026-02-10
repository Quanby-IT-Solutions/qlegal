"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { format } from "date-fns"
import {
	ChevronDown,
	ChevronRight,
	Download,
	Eye,
	FileText,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
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

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"

type ActTypeFilter = "ALL" | "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"
type ViewMode = "table" | "cards"

function getActTypeLabel(actType: string): string {
	switch (actType) {
		case "ACKNOWLEDGMENT":
			return "Acknowledgment"
		case "AFFIRMATION":
			return "Affirmation"
		case "JURAT":
			return "Jurat"
		case "SIGNATURE_WITNESSING":
			return "Signature Witnessing"
		default:
			return actType
	}
}

function truncateFileName(fileName: string | null | undefined, maxLength = 20): string {
	if (!fileName) return "Untitled Document"
	if (fileName.length <= maxLength) return fileName
	const lastDot = fileName.lastIndexOf(".")
	if (lastDot > 0) {
		const nameWithoutExt = fileName.substring(0, lastDot)
		const ext = fileName.substring(lastDot)
		if (nameWithoutExt.length + ext.length <= maxLength) return fileName
		return `${nameWithoutExt.substring(0, maxLength - ext.length - 3)}...${ext}`
	}
	return `${fileName.substring(0, maxLength - 3)}...`
}

interface DocumentRow {
	id: string
	documentName: string
	documentDescription?: string | null
	executedAt: Date | string
	enpName: string
	enpRollNumber?: string | null
	certificateNumber?: string | null
	docoChainProjectUuid?: string | null
	actType: string
	workflow?: string | null
	location?: string | null
	locationStatement?: string | null
}

function DocumentCard({
	doc,
	entryIndex,
	onViewDocument,
	onDownloadDocument,
	isDownloading,
}: {
	doc: DocumentRow
	entryIndex: number
	onViewDocument: (actId: string, documentName?: string) => void
	onDownloadDocument: (actId: string, documentName?: string) => void
	isDownloading?: boolean
}) {
	const hasSignedDocument = !!doc.docoChainProjectUuid

	return (
		<Card className="flex flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="text-muted-foreground font-mono text-sm">#{entryIndex}</span>
					<div className="flex gap-1">
						<Badge variant="outline" className="text-xs">
							{getActTypeLabel(doc.actType)}
						</Badge>
						{doc.workflow && (
							<Badge variant={doc.workflow === "REN" ? "default" : "secondary"} className="text-xs">
								{doc.workflow}
							</Badge>
						)}
					</div>
				</div>
				<CardTitle className="line-clamp-1 text-base">
					{truncateFileName(doc.documentName, 25)}
				</CardTitle>
				{doc.documentDescription && (
					<CardDescription className="line-clamp-2 text-xs">{doc.documentDescription}</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3 pt-0">
				<div className="flex items-center gap-1 text-sm">
					<User className="text-muted-foreground size-3.5 shrink-0" />
					<p className="font-medium">{doc.enpName}</p>
					{doc.enpRollNumber && (
						<span className="text-muted-foreground text-xs">· Roll #{doc.enpRollNumber}</span>
					)}
				</div>
				<div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
					<span>
						<strong className="text-foreground">Notarized:</strong>{" "}
						{format(new Date(doc.executedAt), "MMM dd, yyyy · hh:mm a")}
					</span>
				</div>
				<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
					{doc.certificateNumber && (
						<span className="font-mono">{doc.certificateNumber}</span>
					)}
				</div>
				<div className="mt-auto flex flex-wrap gap-2 pt-2">
					{hasSignedDocument && (
						<>
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => onViewDocument(doc.id, doc.documentName)}
							>
								<Eye className="mr-1.5 size-3.5" />
								View
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								disabled={isDownloading}
								onClick={() => onDownloadDocument(doc.id, doc.documentName)}
							>
								{isDownloading ? (
									<Loader2 className="mr-1.5 size-3.5 animate-spin" />
								) : (
									<Download className="mr-1.5 size-3.5" />
								)}
								{isDownloading ? "Downloading..." : "Download"}
							</Button>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

function ExpandedDocumentDetails({
	doc,
	isExpanded,
}: {
	doc: DocumentRow
	isExpanded: boolean
}) {
	const { data: signersData, isPending: isSignersLoading } =
		trpc.documents.getActSigners.useQuery(
			{ actId: doc.id },
			{ enabled: isExpanded && !!doc.docoChainProjectUuid }
		)
	const signers = signersData?.signers ?? []
	const isSignerSigned = (s: { status?: string; signedAt?: string | null }) => {
		const statusUpper = (s.status ?? "").toUpperCase()
		return statusUpper === "SIGNED" || statusUpper === "COMPLETED" || !!s.signedAt
	}

	return (
		<div className="space-y-4">
			{/* Signatories section – same as ENP notarial registry */}
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
							const isWitness =
								(signer as { signerRole?: string }).signerRole
									?.toUpperCase()
									?.includes("WITNESS") ?? false
							return (
								<div
									key={signer.id}
									className="bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2"
								>
									<div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
										<User className="text-muted-foreground size-4" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-medium">
											{displayName}
											{isWitness && (
												<Badge
													variant="outline"
													className="ml-2 text-[10px] font-normal"
												>
													Witness
												</Badge>
											)}
										</p>
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
										{(() => {
											const s = signer as {
												fullAddress?: string | null
												homeStreet?: string | null
												barangay?: string | null
												cityProvince?: string | null
											}
											const addr =
												s.fullAddress ??
												[s.homeStreet, s.barangay, s.cityProvince].filter(Boolean).join(", ")
											return addr ? (
												<p className="text-muted-foreground mt-0.5 truncate text-[11px]">
													{addr}
												</p>
											) : null
										})()}
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

			{/* Act metadata row – same layout as ENP notarial registry */}
			<div className="text-muted-foreground flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-t pt-3 text-xs">
				<span>
					<span className="font-medium">Act type</span>{" "}
					<Badge variant="outline" className="text-xs font-medium">
						{getActTypeLabel(doc.actType)}
					</Badge>
				</span>
				<span>·</span>
				{doc.workflow && (
					<>
						<span>
							<span className="font-medium">Workflow</span>{" "}
							<Badge
								variant={doc.workflow === "REN" ? "default" : "secondary"}
								className="text-xs font-medium"
							>
								{doc.workflow}
							</Badge>
						</span>
						<span>·</span>
					</>
				)}
				<span>
					<span className="font-medium">Location</span> {doc.location ?? "Philippines"}
				</span>
				<span>·</span>
				<span>
					<span className="font-medium">Certificate #</span>{" "}
					<span className="font-mono">{doc.certificateNumber ?? "—"}</span>
				</span>
			</div>
			{doc.documentDescription && (
				<div className="text-xs">
					<span className="text-muted-foreground font-medium">Description:</span>{" "}
					{doc.documentDescription}
				</div>
			)}
			{doc.locationStatement && (
				<div className="text-xs">
					<span className="text-muted-foreground font-medium">Certification:</span>
					<p className="text-foreground/90 mt-0.5 italic">{doc.locationStatement}</p>
				</div>
			)}
		</div>
	)
}

export default function DocumentsPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [actTypeFilter, setActTypeFilter] = useState<ActTypeFilter>("ALL")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [viewMode, setViewMode] = useState<ViewMode>("table")
	const [viewingActId, setViewingActId] = useState<string | null>(null)
	const [downloadingActId, setDownloadingActId] = useState<string | null>(null)
	const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set())

	const toggleExpanded = useCallback((id: string) => {
		setExpandedDocIds(prev => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const utils = trpc.useUtils()
	const { data: documents, isPending, error, refetch, isFetching } =
		trpc.documents.getMyNotarizedDocuments.useQuery()

	const viewingDocument = documents?.find(d => d.id === viewingActId)
	const { data: signedDocumentData, isPending: isFetchingSignedDocument } =
		trpc.documents.getSignedDocument.useQuery(
			{ actId: viewingActId! },
			{ enabled: !!viewingActId, retry: false }
		)

	const filteredDocuments = useMemo((): DocumentRow[] => {
		if (!documents) return []
		let filtered = documents

		if (searchTerm.trim()) {
			const q = searchTerm.toLowerCase()
			filtered = filtered.filter(
				doc =>
					doc.documentName.toLowerCase().includes(q) ||
					doc.enpName.toLowerCase().includes(q) ||
					(doc.certificateNumber?.toLowerCase().includes(q) ?? false) ||
					doc.actType.toLowerCase().includes(q)
			)
		}
		if (actTypeFilter !== "ALL") {
			filtered = filtered.filter(doc => doc.actType === actTypeFilter)
		}
		if (workflowFilter !== "ALL") {
			filtered = filtered.filter(doc => doc.workflow === workflowFilter)
		}

		return [...filtered].sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
	}, [documents, searchTerm, actTypeFilter, workflowFilter])

	const handleViewDocument = useCallback((actId: string) => {
		setViewingActId(actId)
	}, [])

	const handleDownloadDocument = useCallback(
		async (actId: string, documentName: string) => {
			setDownloadingActId(actId)
			try {
				const response = await utils.documents.getSignedDocument.fetch({ actId })
				if (!response?.base64) throw new Error("No document data available")
				const binaryString = atob(response.base64)
				const bytes = new Uint8Array(binaryString.length)
				for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
				const blob = new Blob([bytes], { type: "application/pdf" })
				const url = URL.createObjectURL(blob)
				const link = document.createElement("a")
				link.href = url
				link.download = response.fileName || `${documentName}.pdf`
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				URL.revokeObjectURL(url)
				toast.success("Document downloaded successfully")
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Failed to download document")
			} finally {
				setDownloadingActId(null)
			}
		},
		[utils]
	)

	const handleRefresh = useCallback(async () => {
		try {
			const result = await refetch()
			if (result.error) toast.error("Failed to refresh")
			else toast.success("Documents refreshed")
		} catch {
			toast.error("Failed to refresh")
		}
	}, [refetch])

	const clearFilters = useCallback(() => {
		setSearchTerm("")
		setActTypeFilter("ALL")
		setWorkflowFilter("ALL")
		setViewMode("table")
		setExpandedDocIds(new Set())
	}, [])

	if (error) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-destructive">
							Error loading documents: {error.message ?? "Unknown error"}
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Documents", href: "/documents" }]} />

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
									<FileText className="size-8" />
									My Notarized Documents
								</h1>
								<p className="text-muted-foreground mt-2 max-w-2xl">
									View and download documents that have been notarized for you.
								</p>
							</div>
							<Button
								variant="outline"
								onClick={() => void handleRefresh()}
								disabled={isPending || isFetching}
							>
								<RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
								{isFetching ? "Refreshing..." : "Refresh"}
							</Button>
						</div>

						<Card className="mb-8">
							<CardContent className="pt-6">
								<Tabs value={actTypeFilter} onValueChange={v => setActTypeFilter(v as ActTypeFilter)}>
									<div className="mb-4">
										<TabsList className="bg-muted/50 flex h-auto flex-wrap gap-1 p-1">
											<TabsTrigger value="ALL" className="text-sm">All</TabsTrigger>
											<TabsTrigger value="ACKNOWLEDGMENT" className="text-sm">Acknowledgment</TabsTrigger>
											<TabsTrigger value="AFFIRMATION" className="text-sm">Affirmation</TabsTrigger>
											<TabsTrigger value="JURAT" className="text-sm">Jurat</TabsTrigger>
											<TabsTrigger value="SIGNATURE_WITNESSING" className="text-sm">
												Signature Witnessing
											</TabsTrigger>
										</TabsList>
									</div>
									<TabsContent value={actTypeFilter} className="mt-0">
										<div className="space-y-3">
											<div className="flex flex-col gap-3 md:flex-row md:items-center">
												<Input
													placeholder="Search by document name, notary, or certificate number..."
													value={searchTerm}
													onChange={e => setSearchTerm(e.target.value)}
												/>
												<Select
													value={workflowFilter}
													onValueChange={v => setWorkflowFilter(v as "ALL" | "REN" | "IEN")}
												>
													<SelectTrigger className="md:w-[180px]">
														<SelectValue placeholder="All Workflows" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="ALL">All Workflows</SelectItem>
														<SelectItem value="REN">REN</SelectItem>
														<SelectItem value="IEN">IEN</SelectItem>
													</SelectContent>
												</Select>
												<Button
													variant="outline"
													type="button"
													onClick={clearFilters}
													className="md:w-[140px]"
												>
													Clear filters
												</Button>
											</div>

											<div className="flex items-center justify-between gap-2">
												<div className="text-muted-foreground text-sm">View:</div>
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

						<Card>
							<CardHeader>
								<CardTitle>Documents Register</CardTitle>
								<CardDescription>
									{isPending ? (
										<Skeleton className="h-4 w-32" />
									) : (
										<>
											{filteredDocuments.length} document
											{filteredDocuments.length !== 1 ? "s" : ""} recorded
										</>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{isPending ? (
									<div className="space-y-4">
										{Array.from({ length: 5 }).map((_, i) => (
											<Skeleton key={i} className="h-16 w-full" />
										))}
									</div>
								) : filteredDocuments.length === 0 ? (
									<div className="py-12 text-center">
										<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
										<h3 className="mb-2 text-lg font-medium">No notarized documents found</h3>
										<p className="text-muted-foreground mb-4">
											{searchTerm || actTypeFilter !== "ALL" || workflowFilter !== "ALL"
												? "Try adjusting your search or filters."
												: "You don't have any notarized documents yet."}
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
												{filteredDocuments.map((doc, index) => {
													const total = filteredDocuments.length
													const entryIndex = total - index
													return (
													<motion.div
														key={doc.id}
														variants={{
															visible: { opacity: 1, y: 0 },
															hidden: { opacity: 0, y: 12 },
														}}
														transition={{ duration: 0.25 }}
													>
														<DocumentCard
															doc={doc}
															entryIndex={entryIndex}
															onViewDocument={handleViewDocument}
															onDownloadDocument={handleDownloadDocument}
															isDownloading={downloadingActId === doc.id}
														/>
													</motion.div>
													)
												})}
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
														<TableHead className="min-w-[120px] sm:min-w-[140px]">Document</TableHead>
														<TableHead className="min-w-[120px] sm:min-w-[140px]">Notary</TableHead>
														<TableHead className="w-24 sm:w-28">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredDocuments.map((doc, index) => {
														const isExpanded = expandedDocIds.has(doc.id)
														const total = filteredDocuments.length
														const entryIndex = total - index
														return (
															<Fragment key={doc.id}>
																<TableRow className={isExpanded ? "border-b-0" : undefined}>
																	<TableCell className="align-top font-mono text-xs font-medium sm:text-sm">
																		{entryIndex}
																	</TableCell>
																	<TableCell className="align-top whitespace-nowrap text-xs sm:text-sm">
																		{format(new Date(doc.executedAt), "MMM dd, yyyy · hh:mm a")}
																	</TableCell>
																	<TableCell className="max-w-[140px] min-w-0 align-top sm:max-w-[200px]">
																		<p className="truncate text-xs font-medium sm:text-sm">
																			{truncateFileName(doc.documentName, 24)}
																		</p>
																	</TableCell>
																	<TableCell className="min-w-0 align-top">
																		<p className="truncate text-xs font-medium sm:text-sm">{doc.enpName}</p>
																		{doc.enpRollNumber && (
																			<p className="text-muted-foreground truncate text-xs">
																				Roll #{doc.enpRollNumber}
																			</p>
																		)}
																	</TableCell>
																	<TableCell className="align-top">
																		<div className="flex items-center justify-end gap-0.5 sm:gap-1">
																			{doc.docoChainProjectUuid && (
																				<>
																					<Button
																						variant="ghost"
																						size="sm"
																						className="size-7 p-0 sm:size-8"
																						onClick={() => handleViewDocument(doc.id)}
																						title="View Document"
																					>
																						<Eye className="size-3.5 sm:size-4" />
																					</Button>
																					<Button
																						variant="ghost"
																						size="sm"
																						className="size-7 p-0 sm:size-8"
																						disabled={downloadingActId === doc.id}
																						onClick={() => handleDownloadDocument(doc.id, doc.documentName)}
																						title={
																							downloadingActId === doc.id ? "Downloading..." : "Download"
																						}
																					>
																						{downloadingActId === doc.id ? (
																							<Loader2 className="size-3.5 animate-spin sm:size-4" />
																						) : (
																							<Download className="size-3.5 sm:size-4" />
																						)}
																					</Button>
																				</>
																			)}
																			<Button
																				variant="ghost"
																				size="sm"
																				className="size-7 p-0 sm:size-8"
																				onClick={() => toggleExpanded(doc.id)}
																				title={isExpanded ? "Collapse" : "Expand details"}
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
																<TableRow className="bg-muted/30 hover:bg-muted/30" aria-hidden={!isExpanded}>
																	<TableCell colSpan={5} className="p-0 align-top">
																		<motion.div
																			animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
																			transition={{
																				type: "spring",
																				stiffness: 300,
																				damping: 30,
																				mass: 0.8,
																			}}
																			className="overflow-hidden"
																		>
																			<div className="px-4 py-3 sm:px-6">
																				<ExpandedDocumentDetails
																					doc={doc}
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

			<Dialog open={!!viewingActId} onOpenChange={open => !open && setViewingActId(null)}>
				<DialogContent
					className="!m-0 !flex !h-[96vh] !w-[96vw] !max-w-none flex-col !gap-0 overflow-hidden !rounded-lg !p-0"
					style={{ maxWidth: "96vw" }}
				>
					<DialogHeader className="flex shrink-0 border-b p-4">
						<DialogTitle>{viewingDocument?.documentName ?? "View Document"}</DialogTitle>
					</DialogHeader>
					<div className="flex min-h-0 flex-1 flex-col">
						{isFetchingSignedDocument && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Loader2 className="mx-auto mb-4 size-8 animate-spin" />
									<p className="text-muted-foreground">Loading document...</p>
								</div>
							</div>
						)}
						{signedDocumentData?.documentUrl && !isFetchingSignedDocument && (
							<div className="flex-1 overflow-hidden">
								<SimplePdfViewer
									fileUrl={signedDocumentData.documentUrl}
									documentName={signedDocumentData.fileName}
								/>
							</div>
						)}
						{!signedDocumentData?.documentUrl && !isFetchingSignedDocument && viewingActId && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
									<p className="text-muted-foreground">
										Unable to load document. Please try downloading it instead.
									</p>
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
