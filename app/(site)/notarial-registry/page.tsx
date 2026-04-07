"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import {
	BookOpen,
	ChevronDown,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"

import { trpc } from "@/services/trpc/client"

import { NotarialActDocumentDialog2 } from "@/features/notarial-book/components/notarial-act-document-dialog-2"
import {
	NotarialRegistryDataGrid,
	type NotarialActRow,
	type SortBy,
	type SortDir,
} from "@/features/notarial-book/components/notarial-registry-data-grid"
import { PrincipalIdDialog } from "@/features/notarial-book/components/principal-id-dialog"
import {
	buildNotarialBookCsv,
	buildNotarialBookPdf,
} from "@/features/notarial-book/lib/notarial-book-export-document"

type ActTypeFilter = "ALL" | "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"

type ViewMode = "table" | "cards"

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
					{act.principalIdType ? (
						<p className="text-muted-foreground text-xs">{act.principalIdType}</p>
					) : null}
					{act.principalIdNumber && (
						<p className="text-muted-foreground text-xs">ID: {act.principalIdNumber}</p>
					)}
					{act.principalAddress && (
						<p className="text-muted-foreground text-xs">Address: {act.principalAddress}</p>
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
							{act.documentId && (
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
							disabled
							title="Temporarily unavailable while signing integration is rebuilt"
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

	const { data: signersData, isLoading: isSignersLoading } =
		trpc.notarialBook.getActSigners.useQuery(
			{ actId: act.id },
			{ enabled: isExpanded && !!act.id }
		)
	const signers = (signersData?.signers ?? []) as ActSigner[]
	const isSignerSigned = (s: { status?: string | null; signedAt?: string | null }) => {
		const statusUpper = (s.status ?? "").toUpperCase()
		return statusUpper === "SIGNED" || statusUpper === "COMPLETED" || !!s.signedAt
	}

	// const principalCompetentEvidence = [act.principalIdType, act.principalIdNumber]
	// 	.filter(Boolean)
	// 	.join(" · ") || undefined

	return (
		<div className="space-y-3">
			{/* Principal disclosure (commented out)
			{(act.principalName ||
				act.principalIdNumber ||
				act.principalAddress ||
				act.principalIdImageBase64) && (
				<div>
					<h4 className="mb-1.5 text-xs font-semibold">Principal</h4>
					<div className="bg-muted/50 flex items-center gap-2 rounded-lg border px-2 py-1.5">
						<div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
							<User className="text-muted-foreground size-3.5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1">
								<p className="text-xs font-medium leading-tight">{act.principalName || "—"}</p>
								{act.principalIdImageBase64 && (
									<Button
										variant="ghost"
										size="sm"
										className="size-6 p-0"
										onClick={() =>
											onViewSignerId(
												act.principalName || "Principal",
												act.principalIdImageBase64!,
												principalCompetentEvidence ?? null
											)
										}
										title="View ID"
									>
										<IdCard className="size-3" />
									</Button>
								)}
							</div>
							{act.principalIdType && (
								<p className="text-muted-foreground text-[10px] leading-tight">{act.principalIdType}</p>
							)}
							{act.principalIdNumber && (
								<p className="text-muted-foreground text-[10px] leading-tight">ID: {act.principalIdNumber}</p>
							)}
							{act.principalAddress && (
								<p className="text-muted-foreground mt-0.5 text-[10px] wrap-break-word leading-tight">
									<span className="font-medium">Address:</span> {act.principalAddress}
								</p>
							)}
						</div>
					</div>
				</div>
			)}
			*/}

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
						Signer data is temporarily unavailable while we rebuild the signing integration.
					</p>
				) : (
					<div className="space-y-1.5">
						{signers.map(signer => {
							const fullName = [signer.firstName, signer.lastName].filter(Boolean).join(" ").trim()
							const displayName = fullName ? fullName : (signer.email ?? "Unknown")
							const signed = isSignerSigned(signer)
							const signerRoleUpper = ((signer as { signerRole?: string }).signerRole ?? "")
								.toString()
								.toUpperCase()
							const isNotary = signerRoleUpper === "NOTARY"
							const isPrincipal = signerRoleUpper === "PRINCIPAL"
							const isWitness = signerRoleUpper.includes("WITNESS")
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
											{isNotary && (
												<Badge variant="outline" className="text-[9px] font-normal">
													Notary
												</Badge>
											)}
											{isPrincipal && (
												<Badge variant="outline" className="text-[9px] font-normal">
													Principal
												</Badge>
											)}
											{isWitness && !isPrincipal && !isNotary && (
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
	const [pageSize, setPageSize] = useState(50)
	const [viewMode, setViewMode] = useState<ViewMode>("table")

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
	// (External signing integration is currently being rebuilt.)
	const dbQuery = trpc.notarialBook.getNotarialBook.useQuery({
		page,
		perPage: pageSize,
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

	// Export format chosen before calling mutation; used in onSuccess to build CSV or PDF
	const exportFormatRef = useRef<"csv" | "pdf">("csv")

	// Export mutation: backend returns acts; we build CSV or PDF and trigger download
	const exportMutation = trpc.notarialBook.exportNotarialBook.useMutation({
		onSuccess: async data => {
			const acts = data.acts as Array<Record<string, unknown>>
			const meta = data.meta
			if (!acts.length) {
				toast.info("No records to export")
				return
			}
			const timestamp = format(new Date(), "yyyy-MM-dd-HHmm")
			const formatChoice = exportFormatRef.current
			const safeSlug = meta.notaryPublicName
				.replace(/[^\w\s-]/g, "")
				.trim()
				.replace(/\s+/g, "-")
				.slice(0, 40)

			if (formatChoice === "csv") {
				const csv = buildNotarialBookCsv(meta, acts)
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `quanby-notarial-book${safeSlug ? `-${safeSlug}` : ""}-${timestamp}.csv`
				a.style.display = "none"
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
			} else {
				try {
					const pdfBytes = await buildNotarialBookPdf(meta, acts)
					const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
					const url = URL.createObjectURL(blob)
					const a = document.createElement("a")
					a.href = url
					a.download = `quanby-notarial-book${safeSlug ? `-${safeSlug}` : ""}-${timestamp}.pdf`
					a.style.display = "none"
					document.body.appendChild(a)
					a.click()
					document.body.removeChild(a)
					URL.revokeObjectURL(url)
				} catch (err) {
					toast.error(`Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`)
					return
				}
			}
			toast.success("Export downloaded successfully")
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

	const handleExportCsv = () => {
		exportFormatRef.current = "csv"
		exportMutation.mutate()
	}
	const handleExportPdf = () => {
		exportFormatRef.current = "pdf"
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
		toast.error(
			"Certificate retrieval is temporarily unavailable while we rebuild the signing integration."
		)
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
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											disabled={exportMutation.isPending}
										>
											{exportMutation.isPending ? (
												<Loader2 className="mr-2 size-4 animate-spin" />
											) : (
												<Download className="mr-2 size-4" />
											)}
											Export Records
											<ChevronDown className="ml-2 size-4 opacity-50" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={handleExportCsv}>
											<List className="mr-2 size-4" />
											Export as CSV
										</DropdownMenuItem>
										<DropdownMenuItem onClick={handleExportPdf}>
											<FileText className="mr-2 size-4" />
											Export as PDF
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* Filters, sort, view — compact toolbar */}
						<Card className="mb-8">
							<CardContent className="px-3 py-2.5 sm:px-4 sm:py-3">
								<div className="flex flex-col gap-2.5">
									{/* Row 1: Filters */}
									<div className="flex flex-wrap items-center gap-1.5">
										<Select
											value={actTypeFilter}
											onValueChange={value => {
												setActTypeFilter(value as ActTypeFilter)
												setPage(1)
											}}
										>
											<SelectTrigger className="h-7 w-full min-w-0 text-xs sm:w-[130px]">
												<SelectValue placeholder="Act type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ALL">All</SelectItem>
												<SelectItem value="ACKNOWLEDGMENT">Acknowledgment</SelectItem>
												<SelectItem value="AFFIRMATION">Affirmation</SelectItem>
												<SelectItem value="JURAT">Jurat</SelectItem>
												<SelectItem value="SIGNATURE_WITNESSING">Signature Witnessing</SelectItem>
											</SelectContent>
										</Select>
										<Input
											placeholder="Search principal, witness, document…"
											value={searchTerm}
											onChange={e => {
												setSearchTerm(e.target.value)
												setPage(1)
											}}
											className="h-7 w-full min-w-0 max-w-full text-xs sm:w-[180px]"
										/>
										<Select
											value={workflowFilter}
											onValueChange={value => {
												setWorkflowFilter(value as "ALL" | "REN" | "IEN")
												setPage(1)
											}}
										>
											<SelectTrigger className="h-7 w-[92px] text-xs">
												<SelectValue placeholder="Workflow" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ALL">All Workflows</SelectItem>
												<SelectItem value="REN">REN</SelectItem>
												<SelectItem value="IEN">IEN</SelectItem>
											</SelectContent>
										</Select>
										<Button
											variant="ghost"
											size="sm"
											type="button"
											onClick={clearFilters}
											className="h-7 shrink-0 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
										>
											Clear filters
										</Button>
									</div>

									{/* Row 2: Sort + View */}
									<div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-2.5">
										<div className="flex items-center gap-1.5">
											<span className="text-muted-foreground shrink-0 text-[10px] font-medium uppercase tracking-wider">Sort</span>
											<Select
												value={sortBy}
												onValueChange={value => {
													setSortBy(value as SortBy)
													setPage(1)
												}}
											>
												<SelectTrigger className="h-7 w-[108px] text-xs">
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
												<SelectTrigger className="h-7 w-[72px] text-xs">
													<SelectValue placeholder="Order" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="desc">Desc</SelectItem>
													<SelectItem value="asc">Asc</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="text-muted-foreground shrink-0 text-[10px] font-medium uppercase tracking-wider">View</span>
											<ToggleGroup
												type="single"
												value={viewMode}
												onValueChange={v => v && setViewMode(v as ViewMode)}
												variant="outline"
												size="sm"
												className="[&_button]:h-7 [&_button]:min-w-7 [&_button]:px-1.5"
											>
												<ToggleGroupItem value="table" aria-label="Table view" className="size-7 p-0">
													<List className="size-3.5" />
												</ToggleGroupItem>
												<ToggleGroupItem value="cards" aria-label="Cards view" className="size-7 p-0">
													<LayoutGrid className="size-3.5" />
												</ToggleGroupItem>
											</ToggleGroup>
										</div>
									</div>
								</div>
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
												className="min-w-0"
											>
												{notarialBookData ? (
													<NotarialRegistryDataGrid
														acts={filteredActs}
														total={notarialBookData.total}
														totalPages={notarialBookData.totalPages}
														page={page}
														pageSize={pageSize}
														onPageChange={setPage}
														onPageSizeChange={size => {
															setPageSize(size)
															setPage(1)
														}}
														sortBy={sortBy}
														sortDir={sortDir}
														onSortChange={(by, dir) => {
															setSortBy(by)
															setSortDir(dir)
														}}
														isLoading={false}
														isFetching={isFetching}
														expandedActIds={expandedActIds}
														setExpandedActIds={setExpandedActIds}
														onCopyNrid={handleCopyNrid}
														copiedNrid={copiedNrid}
														onViewDocument={handleViewDocument}
														onDownloadDocument={actId => {
															void handleDownloadDocument(actId)
														}}
														onSyncToSupremeCourt={handleSyncToSupremeCourt}
														downloadingActId={downloadingActId}
														syncingActId={syncingActId}
														renderExpandedRow={act => (
															<div className="bg-muted/30">
																<div className="px-3 py-2 sm:px-4">
																	<ExpandedActDetails
																		act={act}
																		isExpanded
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
															</div>
														)}
													/>
												) : null}
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
					competentEvidence={previewPrincipalId.competentEvidence}
				/>
			)}
		</>
	)
}
