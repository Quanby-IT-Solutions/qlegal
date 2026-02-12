"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { format } from "date-fns"
import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	CloudUpload,
	Copy,
	Download,
	Eye,
	FileCheck,
	FileText,
	Hash,
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
type SortBy =
	| "executedAt"
	| "meetingEndedAt"
	| "registryNumber"
	| "principalName"
	| "documentName"
	| "certificateNumber"
	| "actType"
	| "workflow"
type SortDir = "asc" | "desc"

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

function formatIdDocumentTypeLabel(documentType: string | null | undefined): string {
	const raw = (documentType ?? "").trim()
	if (!raw) return "—"
	const upper = raw.toUpperCase()
	const map: Record<string, string> = {
		NATIONAL_ID: "National ID",
		DRIVERS_LICENSE: "Driver's License",
		PASSPORT: "Passport",
		VOTERS_ID: "Voter's ID",
		UMID: "UMID",
		SSS_ID: "SSS ID",
		PHILHEALTH_ID: "PhilHealth ID",
		TIN_ID: "TIN ID",
		POSTAL_ID: "Postal ID",
		PRC_ID: "PRC ID",
		OTHER: "Other",
	}
	return map[upper] ?? titleCaseFromToken(raw)
}

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
	registryNumber?: number | null
	supremeCourtRegistryId?: string | null
	syncedToSupremeCourt?: boolean | null
}

function NotarialActCard({
	act,
	onViewDocument,
	onDownloadDocument,
	onViewCertificate,
	onViewPrincipalId,
	onSyncToSupremeCourt,
	onCopyNrid,
	isDownloading,
	isSyncing,
	copiedNrid,
}: {
	act: NotarialActRow
	onViewDocument: (actId: string, documentName?: string) => void
	onDownloadDocument: (actId: string, documentName?: string) => void
	onViewCertificate: (actId: string) => void
	onViewPrincipalId: (
		principalName: string,
		principalIdImageBase64: string | null | undefined,
		competentEvidence?: string | null
	) => void
	onSyncToSupremeCourt: (actId: string) => void
	onCopyNrid: (nrid: string) => void
	isDownloading?: boolean
	isSyncing?: boolean
	copiedNrid?: string | null
}) {
	return (
		<Card className="flex flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-muted-foreground font-mono text-sm">
							#{act.registryNumber ?? "—"}
						</span>
						{act.supremeCourtRegistryId ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1">
											<Hash className="text-muted-foreground size-3.5" />
											<Button
												variant="ghost"
												size="sm"
												className="h-5 px-0.5 text-xs"
												onClick={() => onCopyNrid(act.supremeCourtRegistryId!)}
											>
												{copiedNrid === act.supremeCourtRegistryId ? (
													<span className="text-green-600 dark:text-green-400">COPIED</span>
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
						) : null}
					</div>
					<div className="flex gap-1">
						<Badge variant="outline" className="text-xs">
							{formatActTypeLabel(act.actType)}
						</Badge>
						<Badge variant={act.workflow === "REN" ? "default" : "secondary"} className="text-xs">
							{formatWorkflowLabel(act.workflow)}
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
									<p className="max-w-xs wrap-break-word">{act.documentName}</p>
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
										<p className="max-w-xs wrap-break-word">{act.documentDescription}</p>
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
									onClick={() => onDownloadDocument(act.id, act.documentName ?? undefined)}
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
					{!act.syncedToSupremeCourt && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="flex-1"
									disabled={!!isSyncing}
									onClick={() => onSyncToSupremeCourt(act.id)}
								>
									{isSyncing ? (
										<Loader2 className="mr-1.5 size-3.5 animate-spin" />
									) : (
										<CloudUpload className="mr-1.5 size-3.5" />
									)}
									{isSyncing ? "Syncing..." : "Sync"}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Sync this act to Supreme Court</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

function ExpandedActDetails({
	act,
	isExpanded,
	onViewSignerId,
}: {
	act: NotarialActRow
	isExpanded: boolean
	onViewSignerId: (
		signerName: string,
		idFaceImageBase64: string,
		competentEvidence?: string | null
	) => void
}) {
	type ActSigner = {
		id: number | string
		email?: string | null
		firstName?: string | null
		lastName?: string | null
		status?: string | null
		signedAt?: string | null
		signerRole?: string | null
		fullAddress?: string | null
		homeStreet?: string | null
		barangay?: string | null
		cityProvince?: string | null
		idFaceImageBase64?: string | null
		idDocumentType?: string | null
		idDocumentNumber?: string | null
		idVerified?: boolean | null
	}

	const { data: signersData, isPending: isSignersLoading } =
		trpc.notarialBook.getActSigners.useQuery(
			{ actId: act.id },
			{ enabled: isExpanded && !!act.docoChainProjectUuid }
		)
	const signers = (signersData?.signers ?? []) as unknown as ActSigner[]
	const isSignerSigned = (s: { status?: string | null; signedAt?: string | null }) => {
		const statusUpper = (s.status ?? "").toUpperCase()
		return statusUpper === "SIGNED" || statusUpper === "COMPLETED" || !!s.signedAt
	}

	return (
		<div className="space-y-3">
			{/* Signatories section */}
			<div>
				<h4 className="mb-1.5 text-xs font-semibold">Signatories</h4>
				{isSignersLoading ? (
					<div className="flex items-center gap-2 py-1.5">
						<Loader2 className="size-3.5 animate-spin" />
						<span className="text-muted-foreground text-xs">Loading signers...</span>
					</div>
				) : signers.length === 0 ? (
					<p className="text-muted-foreground py-1.5 text-xs">
						No signer data available for this document.
					</p>
				) : (
					<div className="space-y-1.5">
						{signers.map(signer => {
							const fullName = [signer.firstName, signer.lastName].filter(Boolean).join(" ").trim()
							const displayName = fullName ? fullName : (signer.email ?? "Unknown")
							const signed = isSignerSigned(signer)
							const isWitness =
								(signer as { signerRole?: string }).signerRole
									?.toUpperCase()
									?.includes("WITNESS") ?? false
							const signerExtra = signer as {
								fullAddress?: string | null
								homeStreet?: string | null
								barangay?: string | null
								cityProvince?: string | null
								idFaceImageBase64?: string | null
								idDocumentType?: string | null
								idDocumentNumber?: string | null
								idVerified?: boolean | null
							}
							const addr =
								signerExtra.fullAddress ??
								[signerExtra.homeStreet, signerExtra.barangay, signerExtra.cityProvince]
									.filter(Boolean)
									.join(", ")
							const evidenceType = formatIdDocumentTypeLabel(signerExtra.idDocumentType)
							const evidenceNumber = (signerExtra.idDocumentNumber ?? "").trim()
							const evidence = evidenceNumber ? `${evidenceType} · ${evidenceNumber}` : evidenceType
							const competentEvidence =
								typeof signerExtra.idVerified === "boolean"
									? `${evidence} · ${signerExtra.idVerified ? "Verified" : "Unverified"}`
									: evidence
							return (
								<div
									key={signer.id}
									className="bg-muted/50 flex items-center gap-2 rounded-lg border px-2 py-1.5"
								>
									<div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
										<User className="text-muted-foreground size-3.5" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1">
											<p className="text-xs leading-tight font-medium">{displayName}</p>
											{isWitness && (
												<Badge variant="outline" className="text-[9px] font-normal">
													Witness
												</Badge>
											)}
											{signerExtra.idFaceImageBase64 ? (
												<Button
													variant="ghost"
													size="sm"
													className="size-6 p-0"
													onClick={() => {
														onViewSignerId(
															displayName,
															signerExtra.idFaceImageBase64!,
															competentEvidence
														)
													}}
													title="View ID"
												>
													<IdCard className="size-3" />
												</Button>
											) : null}
											{act.locationStatement && (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<Info
																className="text-muted-foreground size-3 shrink-0 cursor-help"
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
										<p className="text-muted-foreground truncate text-[10px] leading-tight">
											{signer.email}
											{signer.signedAt && !Number.isNaN(new Date(signer.signedAt).getTime()) && (
												<>
													{" "}
													· <span className="font-medium">Signed:</span>{" "}
													{format(new Date(signer.signedAt), "MMM dd, yyyy · hh:mm a")}
												</>
											)}
										</p>
										{addr ? (
											<p className="text-muted-foreground mt-0.5 text-[10px] leading-tight wrap-break-word">
												<span className="font-medium">Address:</span> {addr}
											</p>
										) : null}
										{/* Competent evidence moved into the ID modal */}
									</div>
									<Badge
										variant={signed ? "default" : "secondary"}
										className={
											signed ? "bg-green-600 text-[10px] dark:bg-green-700" : "text-[10px]"
										}
									>
										{signed ? "Signed" : (signer.status ?? "Pending")}
									</Badge>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}

export default function NotarialRegistryPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [actTypeFilter, setActTypeFilter] = useState<ActTypeFilter>("ALL")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [sortBy, setSortBy] = useState<SortBy>("executedAt")
	const [sortDir, setSortDir] = useState<SortDir>("desc")
	const [page, setPage] = useState(1)
	const [viewMode, setViewMode] = useState<ViewMode>("table")
	const perPage = 50

	// Document preview state - matches qsign-lite pattern
	const [previewDocument, setPreviewDocument] = useState<{
		actId: string
		documentName: string
	} | null>(null)

	const [previewPrincipalId, setPreviewPrincipalId] = useState<{
		principalName: string
		principalIdImageBase64: string | null | undefined
		competentEvidence?: string | null
	} | null>(null)

	const [expandedActIds, setExpandedActIds] = useState<Set<string>>(new Set())
	const [copiedNrid, setCopiedNrid] = useState<string | null>(null)
	const toggleExpanded = useCallback((actId: string) => {
		setExpandedActIds(prev => {
			const next = new Set(prev)
			if (next.has(actId)) next.delete(actId)
			else next.add(actId)
			return next
		})
	}, [])

	const clearFilters = useCallback(() => {
		setSearchTerm("")
		setActTypeFilter("ALL")
		setWorkflowFilter("ALL")
		setSortBy("executedAt")
		setSortDir("desc")
		setViewMode("table")
		setExpandedActIds(new Set())
		setPage(1)
	}, [])

	// Only show DB notarial acts so entries appear only after "End Session" has been clicked.
	// (DocoChain API returns "processing completed" when signing is done, which would show entries before End Session.)
	const dbQuery = trpc.notarialBook.getNotarialBook.useQuery({
		page,
		perPage,
		search: searchTerm.trim() || undefined,
		actType: actTypeFilter,
		workflow: workflowFilter,
		sortBy,
		sortDir,
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

	const syncToSupremeCourtMutation = trpc.notarialBook.syncActToSupremeCourt.useMutation({
		onSuccess: async data => {
			await refetch()
			toast.success(
				`Synced to Supreme Court. NRID: ${data.notarialRegistryID}, NRN: ${data.notarialRegistryNumber}`
			)
		},
		onError: error => {
			toast.error(`Sync failed: ${error.message}`)
		},
	})
	const [syncingActId, setSyncingActId] = useState<string | null>(null)
	const handleSyncToSupremeCourt = useCallback(
		async (actId: string) => {
			setSyncingActId(actId)
			try {
				await syncToSupremeCourtMutation.mutateAsync({ actId })
			} finally {
				setSyncingActId(null)
			}
		},
		[syncToSupremeCourtMutation]
	)

	const filteredActs = useMemo((): NotarialActRow[] => {
		return (notarialBookData?.acts ?? []) as NotarialActRow[]
	}, [notarialBookData?.acts])

	const handleExport = () => {
		exportMutation.mutate()
	}

	const handleRefresh = async () => {
		try {
			await refetch()
			toast.success("Registry refreshed")
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
	const handleDownloadDocument = useCallback(async (actId: string) => {
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
			toast.error(`Failed to download: ${error instanceof Error ? error.message : "Unknown error"}`)
		} finally {
			setDownloadingActId(null)
		}
	}, [])

	// View principal ID handler
	const handleViewPrincipalId = (
		principalName: string,
		principalIdImageBase64: string | null | undefined,
		competentEvidence?: string | null
	) => {
		setPreviewPrincipalId({
			principalName,
			principalIdImageBase64,
			competentEvidence,
		})
	}

	// Certificate viewing
	const utils = trpc.useUtils()

	const handleCopyNrid = useCallback(async (nrid: string) => {
		try {
			await navigator.clipboard.writeText(nrid)
			setCopiedNrid(nrid)
			toast.success("NRID copied to clipboard")
			setTimeout(() => setCopiedNrid(null), 2000)
		} catch {
			toast.error("Failed to copy NRID")
		}
	}, [])

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
				<PageHeader items={[{ label: "Notarial Registry" }]} />

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
							<div className="flex shrink-0 flex-wrap gap-2">
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
										<div className="space-y-3">
											<div className="flex flex-col gap-3 md:flex-row md:items-center">
												<Input
													placeholder="Search any detail (principal, witness, doc, certificate, signers, location, etc.)..."
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
													<SelectTrigger className="md:w-45">
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
													className="md:w-35"
												>
													Clear filters
												</Button>
											</div>

											<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-muted-foreground text-sm">Sort:</span>
													<Select
														value={sortBy}
														onValueChange={value => {
															setSortBy(value as SortBy)
															setPage(1)
														}}
													>
														<SelectTrigger className="w-42.5">
															<SelectValue placeholder="Sort by" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="executedAt">Signed time</SelectItem>
															<SelectItem value="meetingEndedAt">Meeting ended</SelectItem>
															<SelectItem value="registryNumber">Registry #</SelectItem>
															<SelectItem value="principalName">Principal</SelectItem>
															<SelectItem value="documentName">Document</SelectItem>
															<SelectItem value="certificateNumber">Certificate #</SelectItem>
															<SelectItem value="actType">Act type</SelectItem>
															<SelectItem value="workflow">Workflow</SelectItem>
														</SelectContent>
													</Select>
													<Select
														value={sortDir}
														onValueChange={value => {
															setSortDir(value as SortDir)
															setPage(1)
														}}
													>
														<SelectTrigger className="w-27.5">
															<SelectValue placeholder="Order" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="desc">Desc</SelectItem>
															<SelectItem value="asc">Asc</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className="flex items-center gap-2 md:justify-end">
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
												{filteredActs.map(act => {
													return (
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
																onViewDocument={handleViewDocument}
																onDownloadDocument={handleDownloadDocument}
																onViewCertificate={handleViewCertificate}
																onViewPrincipalId={handleViewPrincipalId}
																onSyncToSupremeCourt={handleSyncToSupremeCourt}
																onCopyNrid={handleCopyNrid}
																isDownloading={downloadingActId === act.id}
																isSyncing={syncingActId === act.id}
																copiedNrid={copiedNrid}
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
												className="min-w-0 **:data-[slot=table-container]:overflow-x-hidden"
											>
												<Table className="w-full max-w-full table-fixed">
													<TableHeader>
														<TableRow>
															<TableHead className="w-12">#</TableHead>
															<TableHead className="w-16">NRID</TableHead>
															<TableHead className="w-28">Act type</TableHead>
															<TableHead className="w-36">Date & time</TableHead>
															<TableHead className="min-w-0 pr-1">Title / description</TableHead>
															<TableHead className="w-24 pl-1 text-left">Fee</TableHead>
															<TableHead className="w-44">Notarization</TableHead>
															<TableHead className="w-28 text-right">Actions</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{filteredActs.map(act => {
															const isExpanded = expandedActIds.has(act.id)
															return (
																<Fragment key={act.id}>
																	<TableRow className={isExpanded ? "border-b-0" : undefined}>
																		<TableCell className="align-top font-mono text-xs font-medium">
																			{act.registryNumber ?? "—"}
																		</TableCell>
																		<TableCell className="align-top">
																			{act.supremeCourtRegistryId ? (
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<div className="flex items-center gap-1">
																								<Hash className="text-muted-foreground size-3.5" />
																								<Button
																									variant="ghost"
																									size="sm"
																									className="h-6 px-0.5 text-xs"
																									onClick={() =>
																										handleCopyNrid(act.supremeCourtRegistryId!)
																									}
																								>
																									{copiedNrid === act.supremeCourtRegistryId ? (
																										<span className="text-xs text-green-600 dark:text-green-400">
																											COPIED
																										</span>
																									) : (
																										<Copy className="size-3" />
																									)}
																								</Button>
																							</div>
																						</TooltipTrigger>
																						<TooltipContent>
																							<p className="font-mono text-xs">
																								{act.supremeCourtRegistryId}
																							</p>
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			) : (
																				<span className="text-muted-foreground text-xs">—</span>
																			)}
																		</TableCell>
																		<TableCell className="min-w-0 align-top">
																			<p className="truncate text-xs font-medium">
																				{formatActTypeLabel(act.actType)}
																			</p>
																		</TableCell>
																		<TableCell className="align-top">
																			<div className="text-xs leading-tight">
																				<div className="font-medium">
																					{format(new Date(act.executedAt), "MMM dd, yyyy")}
																				</div>
																				<div className="text-muted-foreground">
																					{format(new Date(act.executedAt), "hh:mm a")}
																				</div>
																			</div>
																		</TableCell>
																		<TableCell className="min-w-0 align-top">
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
																								<p className="wrap-break-word">
																									{act.documentName}
																								</p>
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
																		</TableCell>
																		<TableCell className="pl-1 text-left align-top">
																			{act.fees !== null &&
																			act.fees !== undefined &&
																			typeof act.fees === "number" &&
																			!Number.isNaN(act.fees) ? (
																				<span className="text-xs font-medium">
																					₱ {act.fees.toFixed(2)}
																				</span>
																			) : (
																				<span className="text-muted-foreground text-xs">—</span>
																			)}
																		</TableCell>
																		<TableCell className="align-top">
																			<p className="text-xs leading-snug font-medium wrap-break-word whitespace-normal">
																				{formatWorkflowLabel(act.workflow)}
																			</p>
																		</TableCell>
																		<TableCell className="align-top">
																			<div className="inline-flex w-full items-center justify-end gap-1">
																				{(act.documentId ?? act.docoChainProjectUuid) && (
																					<Button
																						variant="ghost"
																						size="sm"
																						className="size-7 p-0"
																						onClick={() =>
																							handleViewDocument(
																								act.id,
																								act.documentName ?? undefined
																							)
																						}
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
																						onClick={() => handleDownloadDocument(act.id)}
																						aria-label="Download notarized document"
																						title={
																							downloadingActId === act.id
																								? "Downloading..."
																								: "Download notarized document"
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
																						onClick={() => handleViewCertificate(act.id)}
																						aria-label="View certificate"
																						title="View Certificate"
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
																								onClick={() => handleSyncToSupremeCourt(act.id)}
																								aria-label="Sync to Supreme Court"
																								title={
																									syncingActId === act.id
																										? "Syncing..."
																										: "Sync to Supreme Court"
																								}
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
																					variant="ghost"
																					size="sm"
																					className="size-7 p-0"
																					onClick={() => toggleExpanded(act.id)}
																					aria-label={
																						isExpanded ? "Collapse details" : "Expand details"
																					}
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
																		<TableCell colSpan={8} className="p-0 align-top">
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
																				<div className="px-3 py-2 sm:px-4">
																					<ExpandedActDetails
																						act={act}
																						isExpanded={isExpanded}
																						onViewSignerId={(
																							signerName,
																							idFaceImageBase64,
																							competentEvidence
																						) =>
																							handleViewPrincipalId(
																								signerName,
																								idFaceImageBase64,
																								competentEvidence
																							)
																						}
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
											</motion.div>
										)}
									</AnimatePresence>
								)}

								{!isLoading && notarialBookData && notarialBookData.totalPages > 1 && (
									<div className="mt-6 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
										<div className="text-muted-foreground text-xs">
											Page {page} of {notarialBookData.totalPages} · {notarialBookData.total} total
										</div>
										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={page <= 1 || isFetching}
												onClick={() => setPage(p => Math.max(1, p - 1))}
											>
												Previous
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={page >= notarialBookData.totalPages || isFetching}
												onClick={() => setPage(p => Math.min(notarialBookData.totalPages, p + 1))}
											>
												Next
											</Button>
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
					competentEvidence={previewPrincipalId.competentEvidence}
				/>
			)}
		</>
	)
}
