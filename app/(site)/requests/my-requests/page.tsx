"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle, Calendar, User, Search } from "lucide-react"
import { type Route } from "next"
import { useSession } from "next-auth/react"

import { trpc } from "@/services/trpc/client"
import { PageHeader } from "@/core/components/navbar/page-header"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Skeleton } from "@/core/components/ui/skeleton"

export default function MyRequestsPage() {
	const router = useRouter()
	const { data: session } = useSession()
	const userId = session?.user?.id

	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")

	// Fetch notarization requests for the current user (principal)
	const { data: myRequests = [], isLoading } = trpc.requests.getMyRequests.useQuery(
		undefined,
		{ enabled: !!userId }
	)
	
	// Filter requests based on filters
	const filteredRequests = myRequests.filter((request) => {
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		const matchesSearch = !searchTerm || 
			Boolean(request.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.enp?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
		return matchesStatus && matchesWorkflow && matchesSearch
	})

	// Calculate stats
	const stats = {
		todayCount: filteredRequests.filter(r => {
			const today = new Date()
			const requestDate = new Date(r.createdAt)
			return requestDate.toDateString() === today.toDateString()
		}).length,
		upcomingCount: filteredRequests.filter(r => r.status === "PENDING" || r.status === "IN_PROGRESS").length,
		totalCount: filteredRequests.length,
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
				return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>
			case "REJECTED":
				return <Badge variant="destructive">Rejected</Badge>
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader
				items={[
					{ label: "Notarization Requests", href: "/requests" },
					{ label: "My Requests" },
				]}
			/>
            
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold tracking-tight">My Notarization Requests</h1>
							<p className="mt-2 text-muted-foreground">
								Track the status of your submitted notarization requests
							</p>
							<div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
								<span>{stats.todayCount} today</span>
								<span>•</span>
								<span>{stats.upcomingCount} upcoming</span>
							</div>
						</div>
						<Button onClick={() => router.push("/requests/new" as Route)}>
							<Plus className="mr-2 h-4 w-4" />
							New Request
						</Button>
					</div>

					{/* Filters */}
					<Card className="mb-6">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

						{isLoading ? (
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
								<Card key={request.id} className="hover:shadow-md transition-shadow">
									<CardContent className="p-6">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2">
													<h3 className="text-lg font-semibold">{request.title}</h3>
													{getStatusBadge(request.status)}
													<Badge variant="outline">{request.workflow}</Badge>
													{request.priority && (
														<Badge variant={request.priority === "URGENT" ? "destructive" : request.priority === "HIGH" ? "default" : "secondary"}>
															{request.priority}
														</Badge>
													)}
												</div>
												{request.description && (
													<p className="text-muted-foreground text-sm mb-3">{request.description}</p>
												)}
												<div className="flex items-center gap-4 text-sm text-muted-foreground">
													<div className="flex items-center gap-2">
														<User className="h-4 w-4" />
														<span>{request.enp?.name ?? "Unknown ENP"}</span>
													</div>
													<div className="flex items-center gap-2">
														<Calendar className="h-4 w-4" />
														<span>{new Date(request.createdAt).toLocaleDateString()}</span>
													</div>
													<div className="flex items-center gap-2">
														<FileText className="h-4 w-4" />
														<span>{request.documents ?? 0} document{(request.documents ?? 0) !== 1 ? "s" : ""}</span>
													</div>
												</div>
												<div className="flex items-center gap-2 mt-3">
													{getStatusIcon(request.status)}
													<span className="text-sm text-muted-foreground">
														{request.status === "PENDING" && "Waiting for ENP response"}
														{request.status === "IN_PROGRESS" && "Notarization in progress"}
														{request.status === "COMPLETED" && "Notarization completed"}
														{request.status === "REJECTED" && request.rejectReason ? `Rejected: ${request.rejectReason}` : "Request rejected"}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Avatar className="h-10 w-10">
													<AvatarImage src={request.enp?.image ?? undefined} alt={request.enp?.name ?? "ENP"} />
													<AvatarFallback>{(request.enp?.name ?? "ENP").split(" ").map(n => n[0]).join("")}</AvatarFallback>
												</Avatar>
											</div>
										</div>
									</CardContent>
								</Card>
							))
						) : (
							<Card>
								<CardContent className="py-12 text-center">
									<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No requests found</h3>
									<p className="text-muted-foreground mb-4">
										{searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "You haven't created any notarization requests yet."
										}
									</p>
									<Button onClick={() => router.push("/requests/new" as Route)}>
										<Plus className="mr-2 h-4 w-4" />
										Create Your First Request
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</main>
		</div>
	)
}
