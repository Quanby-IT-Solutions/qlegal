"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
	AlertCircle,
	BookOpen,
	Download,
	Eye,
	FileCheck,
	FileText,
	RefreshCw,
	Search,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
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

import { trpc } from "@/services/trpc/client"

import { NotarialActDocumentDialog2 } from "@/features/notarial-book/components/notarial-act-document-dialog-2"

export default function NotarialBook2Page() {
	const { data: session } = useSession()
	const [searchTerm, setSearchTerm] = useState("")
	const [actTypeFilter, setActTypeFilter] = useState<
		"ALL" | "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"
	>("ALL")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [page, setPage] = useState(1)
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
						<div className="flex items-center justify-between">
							<div>
								<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
									<BookOpen className="h-8 w-8" />
									Notarial Registry
								</h1>
								<p className="text-muted-foreground mt-2">
									Fetches documents directly from DocoChain API (no database sync required)
									<br />
									<span className="text-xs">
										Uses Get Specific Project API to fetch completed projects with seal
									</span>
								</p>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={() => void refetch()}
									variant="outline"
									disabled={isLoading}
								>
									<RefreshCw
										className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
									/>
									{isLoading ? "Refreshing..." : "Refresh"}
								</Button>
								<Button
									onClick={handleExport}
									variant="outline"
									disabled={exportMutation.isPending}
								>
									<Download className="mr-2 h-4 w-4" />
									Export Records
								</Button>
							</div>
						</div>


						{/* Filters */}
						<Card className="mb-8">
							<CardContent className="pt-6">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<Input
										placeholder="Search by principal name, document name, or certificate number..."
										value={searchTerm}
										onChange={e => {
											setSearchTerm(e.target.value)
											setPage(1) // Reset to first page on search
										}}
									/>
									<Select
										value={actTypeFilter}
										onValueChange={value => {
											setActTypeFilter(value as typeof actTypeFilter)
											setPage(1)
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="All Act Types" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ALL">All Act Types</SelectItem>
											<SelectItem value="ACKNOWLEDGMENT">Acknowledgment</SelectItem>
											<SelectItem value="AFFIRMATION">Affirmation</SelectItem>
											<SelectItem value="JURAT">Jurat</SelectItem>
											<SelectItem value="SIGNATURE_WITNESSING">Signature Witnessing</SelectItem>
										</SelectContent>
									</Select>
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
										<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
										<h3 className="mb-2 text-lg font-medium">No notarial acts found</h3>
										<p className="text-muted-foreground mb-4">
											{searchTerm || actTypeFilter !== "ALL" || workflowFilter !== "ALL"
												? "Try adjusting your search criteria or filters."
												: "No completed projects found. Documents are fetched directly from DocoChain API."}
										</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-20">Entry #</TableHead>
													<TableHead>Date & Time</TableHead>
													<TableHead>Act Type</TableHead>
													<TableHead>Workflow</TableHead>
													<TableHead>Principal</TableHead>
													<TableHead>Document</TableHead>
													<TableHead>Location</TableHead>
													<TableHead>Certificate #</TableHead>
													<TableHead className="w-32">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredActs.map((act, index) => (
													<TableRow key={act.id}>
														<TableCell className="font-mono font-medium">
															{(page - 1) * perPage + index + 1}
														</TableCell>
														<TableCell>
															<span className="text-sm">
																{format(new Date(act.executedAt), "MMM dd, yyyy")}
																<br />
																<span className="text-muted-foreground">
																	{format(new Date(act.executedAt), "hh:mm a")}
																</span>
															</span>
														</TableCell>
														<TableCell>
															<Badge variant="outline">{act.actType}</Badge>
														</TableCell>
														<TableCell>
															<Badge variant={act.workflow === "REN" ? "default" : "secondary"}>
																{act.workflow}
															</Badge>
														</TableCell>
														<TableCell>
															<div>
																<p className="font-medium">{act.principalName}</p>
																{act.principalIdNumber && (
																	<p className="text-muted-foreground text-xs">
																		ID: {act.principalIdNumber}
																	</p>
																)}
																{act.witnessName && (
																	<p className="text-muted-foreground mt-1 text-xs">
																		Witness: {act.witnessName}
																	</p>
																)}
															</div>
														</TableCell>
														<TableCell className="max-w-md">
															<div>
																<p className="text-sm font-medium">
																	{act.documentName ?? "Untitled Document"}
																</p>
																{act.documentDescription && (
																	<p className="text-muted-foreground mt-1 text-xs">
																		{act.documentDescription}
																	</p>
																)}
															</div>
														</TableCell>
														<TableCell>
															<span className="text-sm">{act.location ?? "Philippines"}</span>
														</TableCell>
														<TableCell>
															<span className="font-mono text-sm">
																{act.certificateNumber ?? "N/A"}
															</span>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																{(act.documentId ?? act.docoChainProjectUuid) && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			handleViewDocument(act.id, act.documentName ?? undefined)
																		}
																		title="View Document"
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																)}
																{act.docoChainProjectUuid && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => handleViewCertificate(act.id)}
																		title="View Certificate"
																	>
																		<FileCheck className="h-4 w-4" />
																	</Button>
																)}
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
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
