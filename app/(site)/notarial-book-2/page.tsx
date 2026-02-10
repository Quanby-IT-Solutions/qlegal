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
}

function NotarialActCard({
	act,
	onViewDocument,
	onDownloadDocument,
	onViewCertificate,
	onViewPrincipalId,
	isDownloading,
}: {
	act: NotarialActRow
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
					<span className="text-muted-foreground font-mono text-sm">
						#{act.registryNumber ?? "—"}
					</span>
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
				</div>
			</CardContent>
		</Card>
	)
}

function ExpandedActDetails({ act, isExpanded }: { act: NotarialActRow; isExpanded: boolean }) {
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
				<h4 className="mb-2 text-sm font-semibold">Signatories</h4>
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
							const fullName = [signer.firstName, signer.lastName].filter(Boolean).join(" ").trim()
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
											{signer.signedAt && !Number.isNaN(new Date(signer.signedAt).getTime()) && (
												<>
													{" "}
													· <span className="font-medium">Signed:</span>{" "}
													{format(new Date(signer.signedAt), "MMM dd, yyyy · hh:mm a")}
												</>
											)}
										</p>
									</div>
									<Badge
										variant={signed ? "default" : "secondary"}
										className={signed ? "bg-green-600 text-xs dark:bg-green-700" : "text-xs"}
									>
										{signed ? "Signed" : (signer.status ?? "Pending")}
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
				{act.fees != null && typeof act.fees === "number" && !Number.isNaN(act.fees) && (
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
	redirect("/notarial-registry")
}
