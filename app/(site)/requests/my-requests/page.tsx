"use client"

import { useState } from "react"
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Eye, Download } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"

// Mock data for user's requests
const mockMyRequests = [
	{
		id: "req_1",
		title: "Real Estate Purchase Agreement",
		status: "PENDING",
		workflow: "REN",
		enp: {
			name: "Atty. Maria Santos",
			avatar: "/avatars/maria-santos.jpg",
			phone: "+63 917 123 4567",
			email: "maria.santos@notary.ph",
		},
		createdAt: "2024-01-15T10:00:00Z",
		documents: 2,
		priority: "NORMAL",
		estimatedCompletion: "2024-01-16T10:00:00Z",
	},
	{
		id: "req_2",
		title: "Business Contract",
		status: "IN_PROGRESS",
		workflow: "IEN",
		enp: {
			name: "Atty. Juan Dela Cruz",
			avatar: "/avatars/juan-dela-cruz.jpg",
			phone: "+63 917 234 5678",
			email: "juan.delacruz@notary.ph",
		},
		createdAt: "2024-01-14T14:30:00Z",
		documents: 1,
		priority: "HIGH",
		estimatedCompletion: "2024-01-15T14:30:00Z",
	},
	{
		id: "req_3",
		title: "Power of Attorney",
		status: "COMPLETED",
		workflow: "REN",
		enp: {
			name: "Atty. Ana Rodriguez",
			avatar: "/avatars/ana-rodriguez.jpg",
			phone: "+63 917 345 6789",
			email: "ana.rodriguez@notary.ph",
		},
		createdAt: "2024-01-13T09:15:00Z",
		completedAt: "2024-01-13T10:45:00Z",
		documents: 3,
		priority: "NORMAL",
	},
	{
		id: "req_4",
		title: "Will and Testament",
		status: "REJECTED",
		workflow: "IEN",
		enp: {
			name: "Atty. Carlos Mendoza",
			avatar: "/avatars/carlos-mendoza.jpg",
			phone: "+63 917 456 7890",
			email: "carlos.mendoza@notary.ph",
		},
		createdAt: "2024-01-12T16:20:00Z",
		rejectedAt: "2024-01-12T17:30:00Z",
		rejectionReason: "Incomplete documentation",
		documents: 1,
		priority: "HIGH",
	},
]

export default function MyRequestsPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")

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

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "URGENT":
				return <Badge variant="destructive">Urgent</Badge>
			case "HIGH":
				return <Badge variant="default">High</Badge>
			case "NORMAL":
				return <Badge variant="secondary">Normal</Badge>
			default:
				return <Badge variant="secondary">{priority}</Badge>
		}
	}

	const getWorkflowBadge = (workflow: string) => {
		return (
			<Badge variant="outline" className={workflow === "REN" ? "text-blue-600 border-blue-600" : "text-green-600 border-green-600"}>
				{workflow}
			</Badge>
		)
	}

	const filteredRequests = mockMyRequests.filter(request => {
		const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			request.enp.name.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		return matchesSearch && matchesStatus && matchesWorkflow
	})

	const handleViewRequest = (requestId: string) => {
		window.location.href = `/requests/${requestId}`
	}

	const handleDownloadDocuments = (requestId: string) => {
		// Handle document download
		console.log("Downloading documents for request:", requestId)
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" },
					{ label: "My Requests", url: "/requests/my-requests" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">My Notarization Requests</h1>
						<p className="mt-2 text-muted-foreground">
							Track the status of your submitted notarization requests
						</p>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Input
									placeholder="Search requests..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
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

						{filteredRequests.map((request) => (
							<Card key={request.id} className="hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h3 className="text-lg font-medium">{request.title}</h3>
												{getStatusBadge(request.status)}
												{getWorkflowBadge(request.workflow)}
												{getPriorityBadge(request.priority)}
											</div>
											
											<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
												<div className="flex items-center gap-1">
													<User className="h-4 w-4" />
													<span>{request.enp.name}</span>
												</div>
												<div className="flex items-center gap-1">
													<FileText className="h-4 w-4" />
													<span>{request.documents} document{request.documents !== 1 ? "s" : ""}</span>
												</div>
												<div className="flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													<span>Created {new Date(request.createdAt).toLocaleDateString()}</span>
												</div>
											</div>

											<div className="flex items-center gap-2 mb-4">
												{getStatusIcon(request.status)}
												<span className="text-sm">
													{request.status === "PENDING" && "Waiting for ENP response"}
													{request.status === "IN_PROGRESS" && "Notarization in progress"}
													{request.status === "COMPLETED" && `Completed on ${new Date(request.completedAt!).toLocaleDateString()}`}
													{request.status === "REJECTED" && `Rejected: ${request.rejectionReason}`}
												</span>
											</div>

											{/* ENP Contact Info */}
											<div className="bg-muted/50 rounded-lg p-3 mb-4">
												<h4 className="font-medium text-sm mb-2">Assigned Notary</h4>
												<div className="flex items-center gap-3">
													<Avatar className="h-8 w-8">
														<AvatarImage src={request.enp.avatar} alt={request.enp.name} />
														<AvatarFallback>{request.enp.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
													</Avatar>
													<div className="text-sm">
														<p className="font-medium">{request.enp.name}</p>
														<p className="text-muted-foreground">{request.enp.phone} • {request.enp.email}</p>
													</div>
												</div>
											</div>

											{/* Estimated Completion */}
											{request.status === "IN_PROGRESS" && request.estimatedCompletion && (
												<div className="text-sm text-muted-foreground">
													Estimated completion: {new Date(request.estimatedCompletion).toLocaleString()}
												</div>
											)}
										</div>

										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleViewRequest(request.id)}
											>
												<Eye className="mr-2 h-4 w-4" />
												View Details
											</Button>
											{request.status === "COMPLETED" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDownloadDocuments(request.id)}
												>
													<Download className="mr-2 h-4 w-4" />
													Download
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}

						{filteredRequests.length === 0 && (
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
									<Button onClick={() => window.location.href = "/requests/new"}>
										Create Your First Request
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</>
	)
}
