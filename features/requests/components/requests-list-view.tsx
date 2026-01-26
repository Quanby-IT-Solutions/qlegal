"use client"

import { useState } from "react"
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

import { PageHeader } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"

interface IncomingRequest {
	id: string
	title: string
	description: string | null
	status: string
	workflow: string
	priority?: string
	createdAt: Date
	updatedAt: Date
	enpId: string
	principalId: string
	appointmentId: string | null
	rejectReason: string | null
	principal?: {
		name?: string | null
		image?: string | null
	}
	documents?: number
}

interface RequestsListViewProps {
	incomingRequests: IncomingRequest[]
	isRequestsLoading: boolean
	onAccept: (requestId: string) => void
	onReject: (requestId: string) => void
	onComplete: (requestId: string) => void
	processingId: string | null
}

export function RequestsListView({
	incomingRequests,
	isRequestsLoading,
	onAccept,
	onReject,
	onComplete,
	processingId,
}: RequestsListViewProps) {
	// Request management state
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")

	// Filter requests based on filters
	const filteredRequests = incomingRequests.filter(request => {
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		const matchesSearch =
			!searchTerm ||
			Boolean(request.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(
				request.principal?.name &&
				request.principal.name.toLowerCase().includes(searchTerm.toLowerCase())
			)
		return matchesStatus && matchesWorkflow && matchesSearch
	})

	// Calculate stats
	const stats = {
		todayCount: filteredRequests.filter(r => {
			const today = new Date()
			const requestDate = new Date(r.createdAt)
			return requestDate.toDateString() === today.toDateString()
		}).length,
		upcomingCount: filteredRequests.filter(
			r => r.status === "PENDING" || r.status === "IN_PROGRESS"
		).length,
		totalCount: filteredRequests.length,
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "PENDING":
				return <Clock className="size-4 text-yellow-600" />
			case "IN_PROGRESS":
				return <AlertCircle className="size-4 text-blue-600" />
			case "COMPLETED":
				return <CheckCircle className="size-4 text-green-600" />
			case "REJECTED":
				return <XCircle className="size-4 text-red-600" />
			default:
				return <Clock className="size-4 text-gray-600" />
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
		<div className="space-y-6">
			{/* Header */}
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

			{/* Filters */}
			<Card className="mb-6">
				<CardContent className="pt-6">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="relative">
							<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								placeholder="Search requests..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
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
					filteredRequests.map(request => (
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
											<p className="text-muted-foreground mb-3 text-sm">{request.description}</p>
										)}
										<div className="text-muted-foreground flex items-center gap-4 text-sm">
											<div className="flex items-center gap-2">
												<User className="size-4" />
												<span>{request.principal?.name ?? "Unknown Principal"}</span>
											</div>
											<div className="flex items-center gap-2">
												<Calendar className="size-4" />
												<span>{new Date(request.createdAt).toLocaleDateString()}</span>
											</div>
											<div className="flex items-center gap-2">
												<FileText className="size-4" />
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
										<Avatar className="size-10">
											<AvatarImage
												src={request.principal?.image ?? undefined}
												alt={request.principal?.name ?? "Principal"}
											/>
											<AvatarFallback>
												{request.principal?.name
													? request.principal.name
															.split(" ")
															.map(n => n[0])
															.join("")
													: "P"}
											</AvatarFallback>
										</Avatar>

										{request.status === "PENDING" && (
											<div className="flex gap-2">
												<Button
													size="sm"
													variant="default"
													onClick={() => onAccept(request.id)}
													disabled={processingId === request.id}
												>
													{processingId === request.id ? "Processing..." : "Accept"}
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onClick={() => onReject(request.id)}
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
												onClick={() => onComplete(request.id)}
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
	)
}
