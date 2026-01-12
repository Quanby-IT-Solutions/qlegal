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

export default function NotarialBookPage() {
	const { data: session } = useSession()
	const [searchTerm, setSearchTerm] = useState("")
	const [actTypeFilter, setActTypeFilter] = useState<
		"ALL" | "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"
	>("ALL")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [page, setPage] = useState(1)
	const perPage = 50

	// Fetch notarial book entries using Doc On Chain Passport API
	const {
		data: notarialBookData,
		isLoading,
		refetch,
	} = trpc.notarialBook.getNotarialBook.useQuery({
		page,
		perPage,
		search: searchTerm || undefined,
		actType: actTypeFilter,
		workflow: workflowFilter,
	})

	// Auto-sync mutation
	const autoSyncMutation = trpc.notarialBook.autoSyncAllDocuments.useMutation({
		onSuccess: data => {
			toast.success(`Successfully synced ${data.syncedCount} document(s) to notarial book`)
			if (data.errors && data.errors.length > 0) {
				toast.warning(`${data.errors.length} document(s) failed to sync`)
			}
			refetch()
		},
		onError: error => {
			toast.error(`Failed to sync documents: ${error.message}`)
		},
	})

	// Export mutation
	const exportMutation = trpc.notarialBook.exportNotarialBook.useMutation({
		onSuccess: () => {
			toast.success("Notarial book export generated successfully")
		},
		onError: error => {
			toast.error(`Failed to export: ${error.message}`)
		},
	})

	const notarialActs = notarialBookData?.acts || []

	const filteredActs = useMemo(() => {
		if (!notarialActs) return []

		return notarialActs.filter(act => {
			const matchesSearch =
				act.principalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				act.documentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				act.certificateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				false

			return matchesSearch
		})
	}, [notarialActs, searchTerm])

	const handleExport = () => {
		exportMutation.mutate()
	}

	const handleAutoSync = () => {
		if (
			confirm(
				"This will sync all completed documents with DocoChain project UUIDs to your notarial book. Continue?"
			)
		) {
			autoSyncMutation.mutate()
		}
	}

	// Document and certificate viewing
	const utils = trpc.useUtils()

	const handleViewDocument = async (actId: string) => {
		try {
			const result = await utils.notarialBook.getDocumentUrl.fetch({ actId })
			if (result?.url) {
				window.open(result.url, "_blank")
			} else {
				toast.error("Document URL not available")
			}
		} catch (error) {
			toast.error(
				`Failed to get document: ${error instanceof Error ? error.message : "Unknown error"}`
			)
		}
	}

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
				<PageHeader items={[{ label: "Notarial Book", href: "/notarial-book" }]} />

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
									<BookOpen className="h-8 w-8" />
									Electronic Notarial Book
								</h1>
								<p className="text-muted-foreground mt-2">
									Official electronic register of all notarial acts per Supreme Court Rules (A.M.
									No. 24-10-14-SC)
									<br />
									<span className="text-xs">
										Powered by Doc On Chain Passport API for audit trail and verification
									</span>
								</p>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={handleAutoSync}
									variant="outline"
									disabled={autoSyncMutation.isPending}
								>
									<RefreshCw
										className={`mr-2 h-4 w-4 ${autoSyncMutation.isPending ? "animate-spin" : ""}`}
									/>
									{autoSyncMutation.isPending ? "Syncing..." : "Sync Documents"}
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

						{/* Auto-sync info */}
						{autoSyncMutation.isSuccess && autoSyncMutation.data && (
							<Alert className="mb-4">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Synced {autoSyncMutation.data.syncedCount} of{" "}
									{autoSyncMutation.data.totalDocuments} document(s).
									{autoSyncMutation.data.errors && autoSyncMutation.data.errors.length > 0 && (
										<div className="mt-2 text-sm">
											<strong>Errors:</strong>
											<ul className="mt-1 list-inside list-disc">
												{autoSyncMutation.data.errors.slice(0, 3).map((error, i) => (
													<li key={i}>{error}</li>
												))}
												{autoSyncMutation.data.errors.length > 3 && (
													<li>...and {autoSyncMutation.data.errors.length - 3} more</li>
												)}
											</ul>
										</div>
									)}
								</AlertDescription>
							</Alert>
						)}

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
											{notarialBookData?.total || 0} notarial act
											{(notarialBookData?.total || 0) !== 1 ? "s" : ""} recorded
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
												: "You haven't synced any notarial acts yet. Click 'Sync Documents' to import completed documents from Doc On Chain."}
										</p>
										{!searchTerm && actTypeFilter === "ALL" && workflowFilter === "ALL" && (
											<Button
												onClick={handleAutoSync}
												variant="outline"
												disabled={autoSyncMutation.isPending}
											>
												<RefreshCw
													className={`mr-2 h-4 w-4 ${autoSyncMutation.isPending ? "animate-spin" : ""}`}
												/>
												Sync Documents from Doc On Chain
											</Button>
										)}
									</div>
								) : (
									<>
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
																<p className="text-sm font-medium">
																	{act.documentName || "Untitled Document"}
																</p>
																{act.documentDescription && (
																	<p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
																		{act.documentDescription}
																	</p>
																)}
															</TableCell>
															<TableCell>
																<span className="text-sm">{act.location || "Philippines"}</span>
															</TableCell>
															<TableCell>
																<span className="font-mono text-sm">
																	{act.certificateNumber || "N/A"}
																</span>
															</TableCell>
															<TableCell>
																<div className="flex items-center gap-2">
																	{(act.documentId || act.docoChainProjectUuid) && (
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => handleViewDocument(act.id)}
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
										{/* Pagination */}
										{notarialBookData && notarialBookData.totalPages > 1 && (
											<div className="mt-4 flex items-center justify-between border-t pt-4">
												<div className="text-muted-foreground text-sm">
													Showing {(page - 1) * perPage + 1} to{" "}
													{Math.min(page * perPage, notarialBookData.total)} of{" "}
													{notarialBookData.total} entries
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setPage(p => Math.max(1, p - 1))}
														disabled={page === 1}
													>
														Previous
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															setPage(p => Math.min(notarialBookData.totalPages, p + 1))
														}
														disabled={page >= notarialBookData.totalPages}
													>
														Next
													</Button>
												</div>
											</div>
										)}
									</>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</div>
		</>
	)
}
