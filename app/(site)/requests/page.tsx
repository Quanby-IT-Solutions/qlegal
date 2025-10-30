"use client"

import { useState } from "react"
import { Plus, Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"

// Mock data for notarization requests
const mockRequests = {
	myRequests: [
		{
			id: "req_1",
			title: "Real Estate Purchase Agreement",
			status: "PENDING",
			workflow: "REN",
			enp: {
				name: "Atty. Maria Santos",
				avatar: "/avatars/maria-santos.jpg",
			},
			createdAt: "2024-01-15T10:00:00Z",
			documents: 2,
			priority: "NORMAL",
		},
		{
			id: "req_2",
			title: "Business Contract",
			status: "IN_PROGRESS",
			workflow: "IEN",
			enp: {
				name: "Atty. Juan Dela Cruz",
				avatar: "/avatars/juan-dela-cruz.jpg",
			},
			createdAt: "2024-01-14T14:30:00Z",
			documents: 1,
			priority: "HIGH",
		},
		{
			id: "req_3",
			title: "Power of Attorney",
			status: "COMPLETED",
			workflow: "REN",
			enp: {
				name: "Atty. Ana Rodriguez",
				avatar: "/avatars/ana-rodriguez.jpg",
			},
			createdAt: "2024-01-13T09:15:00Z",
			documents: 3,
			priority: "NORMAL",
		},
	],
	incomingRequests: [
		{
			id: "req_4",
			title: "Marriage Contract",
			status: "PENDING",
			workflow: "IEN",
			principal: {
				name: "John Smith",
				email: "john.smith@email.com",
			},
			createdAt: "2024-01-15T11:00:00Z",
			documents: 2,
			priority: "NORMAL",
		},
		{
			id: "req_5",
			title: "Will and Testament",
			status: "PENDING",
			workflow: "REN",
			principal: {
				name: "Jane Doe",
				email: "jane.doe@email.com",
			},
			createdAt: "2024-01-15T08:30:00Z",
			documents: 1,
			priority: "URGENT",
		},
		{
			id: "req_6",
			title: "Property Deed",
			status: "IN_PROGRESS",
			workflow: "IEN",
			principal: {
				name: "Robert Johnson",
				email: "robert.johnson@email.com",
			},
			createdAt: "2024-01-14T16:45:00Z",
			documents: 4,
			priority: "HIGH",
		},
	]
}

export default function RequestsPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")
	const [activeTab, setActiveTab] = useState("my-requests")

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

	const filteredRequests = (requests: any[]) => {
		return requests.filter(request => {
			const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(request.enp?.name || request.principal?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
			const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
			const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
			return matchesSearch && matchesStatus && matchesWorkflow
		})
	}

	const handleCreateRequest = () => {
		window.location.href = "/requests/new"
	}

	const handleViewRequest = (requestId: string) => {
		window.location.href = `/requests/${requestId}`
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight">Notarization Requests</h1>
								<p className="mt-2 text-muted-foreground">
									Manage your notarization requests and incoming requests from clients
								</p>
							</div>
							<Button onClick={handleCreateRequest}>
								<Plus className="mr-2 h-4 w-4" />
								New Request
							</Button>
						</div>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								<Input
									placeholder="Search requests..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="md:col-span-2"
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

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="my-requests">My Requests</TabsTrigger>
							<TabsTrigger value="incoming-requests">Incoming Requests</TabsTrigger>
						</TabsList>

						<TabsContent value="my-requests" className="mt-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-semibold">My Notarization Requests</h2>
									<span className="text-sm text-muted-foreground">
										{filteredRequests(mockRequests.myRequests).length} request{filteredRequests(mockRequests.myRequests).length !== 1 ? "s" : ""}
									</span>
								</div>

								{filteredRequests(mockRequests.myRequests).map((request) => (
									<Card key={request.id} className="hover:shadow-md transition-shadow cursor-pointer"
										onClick={() => handleViewRequest(request.id)}>
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
															<span>{new Date(request.createdAt).toLocaleDateString()}</span>
														</div>
													</div>

													<div className="flex items-center gap-2">
														{getStatusIcon(request.status)}
														<span className="text-sm">
															{request.status === "PENDING" && "Waiting for ENP response"}
															{request.status === "IN_PROGRESS" && "Notarization in progress"}
															{request.status === "COMPLETED" && "Notarization completed"}
															{request.status === "REJECTED" && "Request rejected"}
														</span>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<Avatar className="h-10 w-10">
														<AvatarImage src={request.enp.avatar} alt={request.enp.name} />
														<AvatarFallback>{request.enp.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
													</Avatar>
												</div>
											</div>
										</CardContent>
									</Card>
								))}

								{filteredRequests(mockRequests.myRequests).length === 0 && (
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
											<Button onClick={handleCreateRequest}>
												<Plus className="mr-2 h-4 w-4" />
												Create Your First Request
											</Button>
										</CardContent>
									</Card>
								)}
							</div>
						</TabsContent>

						<TabsContent value="incoming-requests" className="mt-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-semibold">Incoming Requests</h2>
									<span className="text-sm text-muted-foreground">
										{filteredRequests(mockRequests.incomingRequests).length} request{filteredRequests(mockRequests.incomingRequests).length !== 1 ? "s" : ""}
									</span>
								</div>

								{filteredRequests(mockRequests.incomingRequests).map((request) => (
									<Card key={request.id} className="hover:shadow-md transition-shadow cursor-pointer"
										onClick={() => handleViewRequest(request.id)}>
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
															<span>{request.principal.name}</span>
														</div>
														<div className="flex items-center gap-1">
															<FileText className="h-4 w-4" />
															<span>{request.documents} document{request.documents !== 1 ? "s" : ""}</span>
														</div>
														<div className="flex items-center gap-1">
															<Calendar className="h-4 w-4" />
															<span>{new Date(request.createdAt).toLocaleDateString()}</span>
														</div>
													</div>

													<div className="flex items-center gap-2">
														{getStatusIcon(request.status)}
														<span className="text-sm">
															{request.status === "PENDING" && "Waiting for your response"}
															{request.status === "IN_PROGRESS" && "Notarization in progress"}
															{request.status === "COMPLETED" && "Notarization completed"}
															{request.status === "REJECTED" && "Request rejected"}
														</span>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<Avatar className="h-10 w-10">
														<AvatarFallback>{request.principal.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
													</Avatar>
												</div>
											</div>
										</CardContent>
									</Card>
								))}

								{filteredRequests(mockRequests.incomingRequests).length === 0 && (
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
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</>
	)
}
