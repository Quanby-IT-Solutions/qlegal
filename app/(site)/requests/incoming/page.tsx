"use client"

import { useState } from "react"
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Eye, Check, X, Phone, Mail } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Alert, AlertDescription } from "@/core/components/ui/alert"

// Mock data for incoming requests
const mockIncomingRequests = [
	{
		id: "req_1",
		title: "Marriage Contract",
		status: "PENDING",
		workflow: "IEN",
		principal: {
			name: "John Smith",
			email: "john.smith@email.com",
			phone: "+63 917 111 1111",
		},
		createdAt: "2024-01-15T11:00:00Z",
		documents: 2,
		priority: "NORMAL",
		description: "Marriage contract notarization for civil wedding",
		estimatedDuration: 45,
	},
	{
		id: "req_2",
		title: "Will and Testament",
		status: "PENDING",
		workflow: "REN",
		principal: {
			name: "Jane Doe",
			email: "jane.doe@email.com",
			phone: "+63 917 222 2222",
		},
		createdAt: "2024-01-15T08:30:00Z",
		documents: 1,
		priority: "URGENT",
		description: "Urgent will notarization for elderly client",
		estimatedDuration: 30,
	},
	{
		id: "req_3",
		title: "Property Deed",
		status: "IN_PROGRESS",
		workflow: "IEN",
		principal: {
			name: "Robert Johnson",
			email: "robert.johnson@email.com",
			phone: "+63 917 333 3333",
		},
		createdAt: "2024-01-14T16:45:00Z",
		documents: 4,
		priority: "HIGH",
		description: "Property deed transfer notarization",
		estimatedDuration: 60,
	},
	{
		id: "req_4",
		title: "Business Partnership Agreement",
		status: "PENDING",
		workflow: "REN",
		principal: {
			name: "Maria Garcia",
			email: "maria.garcia@email.com",
			phone: "+63 917 444 4444",
		},
		createdAt: "2024-01-15T14:20:00Z",
		documents: 3,
		priority: "NORMAL",
		description: "Partnership agreement for new business venture",
		estimatedDuration: 45,
	},
]

export default function IncomingRequestsPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")
	const [processingRequest, setProcessingRequest] = useState<string | null>(null)

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

	const filteredRequests = mockIncomingRequests.filter(request => {
		const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			request.principal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			request.description.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		return matchesSearch && matchesStatus && matchesWorkflow
	})

	const handleAcceptRequest = async (requestId: string) => {
		setProcessingRequest(requestId)
		try {
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000))
			console.log("Accepted request:", requestId)
			// Update request status in UI
		} catch (error) {
			console.error("Failed to accept request:", error)
		} finally {
			setProcessingRequest(null)
		}
	}

	const handleRejectRequest = async (requestId: string) => {
		setProcessingRequest(requestId)
		try {
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000))
			console.log("Rejected request:", requestId)
			// Update request status in UI
		} catch (error) {
			console.error("Failed to reject request:", error)
		} finally {
			setProcessingRequest(null)
		}
	}

	const handleViewRequest = (requestId: string) => {
		window.location.href = `/requests/${requestId}`
	}

	const handleStartNotarization = (requestId: string) => {
		window.location.href = `/notarize/${requestId}`
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" },
					{ label: "Incoming Requests", url: "/requests/incoming" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
						<p className="mt-2 text-muted-foreground">
							Review and manage notarization requests from clients
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
											
											<p className="text-sm text-muted-foreground mb-3">{request.description}</p>
											
											<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
												<div className="flex items-center gap-1">
													<User className="h-4 w-4" />
													<span>{request.principal.name}</span>
												</div>
												<div className="flex items-center gap-1">
													<FileText className="h-4 w-4" />
													<span>{request.documents} document{request.documents !== 1 ? "s" : ""}</span>
												</div>
												<div className="flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													<span>Received {new Date(request.createdAt).toLocaleDateString()}</span>
												</div>
												<div className="flex items-center gap-1">
													<Clock className="h-4 w-4" />
													<span>~{request.estimatedDuration} min</span>
												</div>
											</div>

											<div className="flex items-center gap-2 mb-4">
												{getStatusIcon(request.status)}
												<span className="text-sm">
													{request.status === "PENDING" && "Waiting for your response"}
													{request.status === "IN_PROGRESS" && "Notarization in progress"}
													{request.status === "COMPLETED" && "Notarization completed"}
													{request.status === "REJECTED" && "Request rejected"}
												</span>
											</div>

											{/* Client Contact Info */}
											<div className="bg-muted/50 rounded-lg p-3 mb-4">
												<h4 className="font-medium text-sm mb-2">Client Information</h4>
												<div className="flex items-center gap-3">
													<Avatar className="h-8 w-8">
														<AvatarFallback>{request.principal.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
													</Avatar>
													<div className="text-sm">
														<p className="font-medium">{request.principal.name}</p>
														<div className="flex items-center gap-2">
															<a href={`tel:${request.principal.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
																<Phone className="h-3 w-3" />
																{request.principal.phone}
															</a>
															<a href={`mailto:${request.principal.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
																<Mail className="h-3 w-3" />
																{request.principal.email}
															</a>
														</div>
													</div>
												</div>
											</div>
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
											
											{request.status === "PENDING" && (
												<>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleAcceptRequest(request.id)}
														disabled={processingRequest === request.id}
													>
														<Check className="mr-2 h-4 w-4" />
														{processingRequest === request.id ? "Processing..." : "Accept"}
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleRejectRequest(request.id)}
														disabled={processingRequest === request.id}
													>
														<X className="mr-2 h-4 w-4" />
														{processingRequest === request.id ? "Processing..." : "Reject"}
													</Button>
												</>
											)}
											
											{request.status === "IN_PROGRESS" && (
												<Button
													size="sm"
													onClick={() => handleStartNotarization(request.id)}
												>
													Start Notarization
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
									<h3 className="text-lg font-medium mb-2">No incoming requests</h3>
									<p className="text-muted-foreground">
										{searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "No clients have requested your notarization services yet."
										}
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</>
	)
}
