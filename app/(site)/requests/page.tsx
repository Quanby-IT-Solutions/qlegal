"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	FileText,
	Search,
	User,
	XCircle,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Alert, AlertDescription } from "@/core/components/ui/alert"

import { trpc } from "@/services/trpc/client"

import { BlockTimeModal } from "@/features/requests/components/block-time-modal"
import { ScheduleLegend } from "@/features/requests/components/schedule-legend"
import { EnpScheduleCalendar } from "@/features/requests/components/enp-schedule-calendar"

export default function RequestsPage() {
	const { data: session } = useSession()
	const pathname = usePathname()
	const userId = session?.user?.id
	const isENP = session?.user?.role === "ENP"

	// View state: requests (primary) vs calendar (secondary)
	const [view, setView] = useState<"requests" | "calendar">("requests")

	// Calendar state
	const [selectedDay, setSelectedDay] = useState<Date | null>(null)
	const [blockModalOpen, setBlockModalOpen] = useState(false)

	// Request management state
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [rejectReason, setRejectReason] = useState("")
	const [processingId, setProcessingId] = useState<string | null>(null)

	// Fetch incoming notarization requests for ENP (primary section)
	const { data: incomingRequests = [], isLoading: isRequestsLoading } =
		trpc.requests.getIncomingRequests.useQuery(undefined, {
			enabled: !!userId && isENP,
		})

	// Mark requests page as viewed when ENP visits
	useEffect(() => {
		if (isENP && pathname === "/requests") {
			const pendingCount = incomingRequests?.filter((r) => r.status === "PENDING").length || 0
			localStorage.setItem("enp_viewed_requests", "true")
			localStorage.setItem("enp_last_viewed_count", pendingCount.toString())
		}
	}, [isENP, pathname, incomingRequests])

	const utils = trpc.useUtils()

	// Filter requests based on filters
	const filteredRequests = incomingRequests.filter((request) => {
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		const matchesSearch =
			!searchTerm ||
			Boolean(request.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.principal?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
		return matchesStatus && matchesWorkflow && matchesSearch
	})

	// Calculate stats
	const stats = {
		todayCount: filteredRequests.filter((r) => {
			const today = new Date()
			const requestDate = new Date(r.createdAt)
			return requestDate.toDateString() === today.toDateString()
		}).length,
		upcomingCount: filteredRequests.filter(
			(r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
		).length,
		totalCount: filteredRequests.length,
	}

	// Mutations
	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			toast.success("Request status updated successfully!")
			setRejectDialogOpen(false)
			setProcessingId(null)
			setRejectReason("")
		},
		onError: (error) => {
			toast.error("Failed to update request", {
				description: error?.message ?? "An unexpected error occurred",
			})
			setProcessingId(null)
		},
	})

	const handleAccept = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "IN_PROGRESS",
		})
	}

	const handleRejectClick = (requestId: string) => {
		setSelectedRequestId(requestId)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)
		await updateStatusMutation.mutateAsync({
			requestId: selectedRequestId,
			status: "REJECTED",
			rejectReason: rejectReason || undefined,
		})
	}

	const handleComplete = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "COMPLETED",
		})
	}

	const handleBlockTimeClick = () => {
		setBlockModalOpen(true)
	}

	const handleDayClick = (day: Date) => {
		setSelectedDay(day)
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "PENDING":
				return <Clock className="h-4 w-4 text-yellow-600" />
			case "IN_PROGRESS":
				return <AlertCircle className="h-4 w-4 text-blue-600" />
			case "COMPLETED":
				return <CheckCircle className="h-4 w-4 text-green-600" />
			case "REJECTED":
				return <XCircle className="h-4 w-4 text-red-600" />
			default:
				return <Clock className="h-4 w-4 text-gray-600" />
		}
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "PENDING":
				return <Badge variant="secondary">Pending</Badge>
			case "IN_PROGRESS":
				return <Badge variant="default">In Progress</Badge>
			case "COMPLETED":
				return (
					<Badge variant="outline" className="border-green-600 text-green-600">
						Completed
					</Badge>
				)
			case "REJECTED":
				return <Badge variant="destructive">Rejected</Badge>
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	return (
		<>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
								<p className="text-muted-foreground mt-2">
									Review and manage notarization requests from clients
								</p>
								<div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
									<span>{stats.todayCount} today</span>
									<span>•</span>
									<span>{stats.upcomingCount} upcoming</span>
								</div>
							</div>

							{/* View Toggle */}
							<Tabs value={view} onValueChange={(v: string) => setView(v as "requests" | "calendar")} className="w-auto">
								<TabsList>
									<TabsTrigger value="requests">Requests</TabsTrigger>
									<TabsTrigger value="calendar">Schedule & Calendar</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						{view === "requests" ? (
							/* =================== PRIMARY: Requests List =================== */
							<div className="space-y-6">
								{/* Filters */}
								<Card className="mb-6">
									<CardContent className="pt-6">
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											<div className="relative">
												<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
												<Input
													placeholder="Search requests..."
													value={searchTerm}
													onChange={(e) => setSearchTerm(e.target.value)}
													className="pl-9"
												/>
											</div>
											<Select value={statusFilter} onValueChange={setStatusFilter}>
												<SelectTrigger>
													<SelectValue placeholder="All Status" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="ALL">All Status</SelectItem>
													<SelectItem value="PENDING">Pending</SelectItem>
													<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
													<SelectItem value="COMPLETED">Completed</SelectItem>
													<SelectItem value="REJECTED">Rejected</SelectItem>
												</SelectContent>
											</Select>
											<Select value={workflowFilter} onValueChange={setWorkflowFilter}>
												<SelectTrigger>
													<SelectValue placeholder="All Workflows" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="ALL">All Workflows</SelectItem>
													<SelectItem value="REN">REN (Remote)</SelectItem>
													<SelectItem value="IEN">IEN (In-Person)</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</CardContent>
								</Card>

								{/* Requests List */}
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h2 className="text-xl font-semibold">
											{filteredRequests.length} Request{filteredRequests.length !== 1 ? "s" : ""}
										</h2>
									</div>

									{isRequestsLoading ? (
										<div className="space-y-4">
											{Array.from({ length: 3 }).map((_, i) => (
												<Card key={i}>
													<CardContent className="p-6">
														<Skeleton className="h-32 w-full" />
													</CardContent>
												</Card>
											))}
										</div>
									) : filteredRequests.length > 0 ? (
										filteredRequests.map((request) => (
											<Card key={request.id} className="transition-shadow hover:shadow-md">
												<CardContent className="p-6">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="mb-2 flex items-center gap-3">
																<h3 className="text-lg font-semibold">{request.title}</h3>
																{getStatusBadge(request.status)}
																<Badge variant="outline">{request.workflow}</Badge>
																{request.priority && (
																	<Badge
																		variant={
																			request.priority === "URGENT"
																				? "destructive"
																				: request.priority === "HIGH"
																					? "default"
																					: "secondary"
																		}
																	>
																		{request.priority}
																	</Badge>
																)}
															</div>
															{request.description && (
																<p className="text-muted-foreground mb-3 text-sm">
																	{request.description}
																</p>
															)}
															<div className="text-muted-foreground flex items-center gap-4 text-sm">
																<div className="flex items-center gap-2">
																	<User className="h-4 w-4" />
																	<span>{request.principal?.name ?? "Unknown Principal"}</span>
																</div>
																<div className="flex items-center gap-2">
																	<Calendar className="h-4 w-4" />
																	<span>{new Date(request.createdAt).toLocaleDateString()}</span>
																</div>
																<div className="flex items-center gap-2">
																	<FileText className="h-4 w-4" />
																	<span>
																		{request.documents ?? 0} document
																		{(request.documents ?? 0) !== 1 ? "s" : ""}
																	</span>
																</div>
															</div>
															<div className="mt-3 flex items-center gap-2">
																{getStatusIcon(request.status)}
																<span className="text-muted-foreground text-sm">
																	{request.status === "PENDING" && "Waiting for your response"}
																	{request.status === "IN_PROGRESS" && "Notarization in progress"}
																	{request.status === "COMPLETED" && "Notarization completed"}
																	{request.status === "REJECTED" && request.rejectReason
																		? `Rejected: ${request.rejectReason}`
																		: "Request rejected"}
																</span>
															</div>
														</div>

														<div className="flex flex-col items-end gap-2">
															<Avatar className="h-10 w-10">
																<AvatarImage
																	src={request.principal?.image ?? undefined}
																	alt={request.principal?.name ?? "Principal"}
																/>
																<AvatarFallback>
																	{(request.principal?.name ?? "P")
																		.split(" ")
																		.map((n) => n[0])
																		.join("")}
																</AvatarFallback>
															</Avatar>

															{request.status === "PENDING" && (
																<div className="flex gap-2">
																	<Button
																		size="sm"
																		variant="default"
																		onClick={() => handleAccept(request.id)}
																		disabled={processingId === request.id}
																	>
																		{processingId === request.id ? "Processing..." : "Accept"}
																	</Button>
																	<Button
																		size="sm"
																		variant="destructive"
																		onClick={() => handleRejectClick(request.id)}
																		disabled={processingId === request.id}
																	>
																		Reject
																	</Button>
																</div>
															)}

															{request.status === "IN_PROGRESS" && (
																<Button
																	size="sm"
																	variant="default"
																	onClick={() => handleComplete(request.id)}
																	disabled={processingId === request.id}
																>
																	{processingId === request.id ? "Processing..." : "Mark Complete"}
																</Button>
															)}
														</div>
													</div>
												</CardContent>
											</Card>
										))
									) : (
										<Card>
											<CardContent className="py-12 text-center">
												<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
												<h3 className="mb-2 text-lg font-medium">No incoming requests</h3>
												<p className="text-muted-foreground">
													{searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL"
														? "Try adjusting your search criteria or filters."
														: "No clients have requested your notarization services yet."}
												</p>
											</CardContent>
										</Card>
									)}
								</div>
							</div>
						) : (
							/* =================== SECONDARY: Schedule & Calendar =================== */
							<div className="space-y-8">
								{/* Quick Match Placeholder */}
								<Alert className="mb-6">
									<AlertDescription className="flex items-start gap-2">
										<Calendar className="mt-1 h-5 w-5 text-muted-foreground" />
										<div className="flex-1">
											<h4 className="font-semibold mb-1">Quick Match - Coming Soon</h4>
											<p className="text-sm text-muted-foreground mb-2">
												Principal-ENP matching feature will allow you to quickly find and connect with the best available
												notary. This feature is planned but not yet implemented. Stay tuned for updates!
											</p>
											<div className="text-sm text-muted-foreground">
												<b>How it will work:</b>
												<ul className="list-disc list-inside mt-2 text-sm space-y-1">
													<li>
														<span>Smart algorithm matches ENPs based on your document type, location, and availability</span>
													</li>
													<li>
														<span>Bidirectional scoring system ensures fair ENP selection</span>
													</li>
													<li>
														<span>ENPs can set availability preferences and opt-in/out of Quick Match</span>
													</li>
													<li>
														<span>Real-time accept/decline with timeout prevents delays</span>
													</li>
												</ul>
											</div>
										</div>
									</AlertDescription>
								</Alert>

								{/* Schedule & Calendar Section */}
								<Card>
									<CardHeader>
										<div className="flex items-center justify-between">
											<CardTitle className="flex items-center gap-2">
												<Calendar className="h-5 w-5" />
												Schedule & Calendar
											</CardTitle>
											<div className="flex items-center gap-2">
												<Button onClick={handleBlockTimeClick} type="button">
													<Calendar className="mr-2 h-4 w-4" />
													Block Time
												</Button>
											</div>
										</div>
									</CardHeader>

									<CardContent className="p-6 space-y-4">
										{/* Legend */}
										<div className="mb-4">
											<ScheduleLegend />
										</div>

										{/* Calendar Component */}
										<div>
											<div className="mb-4 text-sm text-muted-foreground">
												Click on a day to view details or manage availability for that date.
											</div>
											<EnpScheduleCalendar
												selectedDay={selectedDay}
												onDayClick={handleDayClick}
												onBlockTimeClick={handleBlockTimeClick}
											/>
										</div>

										{/* Selected Day Details Panel */}
										{selectedDay && (
											<div className="mt-4 rounded-lg border bg-muted/30 p-4">
												<h3 className="font-semibold mb-2">
													{selectedDay.toLocaleDateString("en-US", {
														weekday: "long",
														month: "long",
														day: "numeric",
													})}
												</h3>
												<p className="text-muted-foreground text-sm mb-4">
													Manage your availability for this date or view details.
												</p>
												<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
													<div className="flex items-center gap-1">
														<Calendar className="h-3 w-3" />
														<span>Click day above to block/unblock</span>
													</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Reject Dialog */}
			<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Request</DialogTitle>
						<DialogDescription>
							Are you sure you want to reject this notarization request? You can provide an optional
							reason.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<Label htmlFor="reject-reason">Reason (optional)</Label>
							<Textarea
								id="reject-reason"
								placeholder="Enter rejection reason..."
								value={rejectReason}
								onChange={(e) => setRejectReason(e.target.value)}
								className="mt-1"
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setRejectDialogOpen(false)
									setRejectReason("")
									setSelectedRequestId(null)
								}}
								type="button"
							>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleReject} disabled={processingId !== null}>
								{processingId ? "Processing..." : "Reject Request"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Block Time Modal */}
			{blockModalOpen && (
				<BlockTimeModal
					isOpen={blockModalOpen}
					onClose={() => setBlockModalOpen(false)}
					onSave={async (data) => {
						console.log("Block time data:", data)
						// Will be connected to blockTimeSlot mutation
						toast.success("Time slot block feature coming soon - API integration pending")
						setBlockModalOpen(false)
					}}
				/>
			)}
		</>
	)
}
