"use client"

import { useState } from "react"
import { Search, Filter, Clock, CheckCircle, XCircle, FileText, Calendar, User, Download, Eye, Video, Handshake } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

// Mock data for notarization history
const mockNotarizationHistory = [
	{
		id: "not_1",
		title: "Real Estate Purchase Agreement",
		status: "COMPLETED",
		workflow: "REN",
		enp: {
			name: "Atty. Maria Santos",
			avatar: "/avatars/maria-santos.jpg",
		},
		principal: {
			name: "John Doe",
			email: "john.doe@email.com",
		},
		completedAt: "2024-01-15T10:45:00Z",
		duration: 45,
		documents: 2,
		location: "Remote Video Call",
		certificateUrl: "/certificates/not_1.pdf",
		recordingUrl: "/recordings/not_1.mp4",
	},
	{
		id: "not_2",
		title: "Business Contract",
		status: "COMPLETED",
		workflow: "IEN",
		enp: {
			name: "Atty. Juan Dela Cruz",
			avatar: "/avatars/juan-dela-cruz.jpg",
		},
		principal: {
			name: "Jane Smith",
			email: "jane.smith@email.com",
		},
		completedAt: "2024-01-14T15:30:00Z",
		duration: 60,
		documents: 1,
		location: "123 Main St, Makati City",
		certificateUrl: "/certificates/not_2.pdf",
		recordingUrl: null,
	},
	{
		id: "not_3",
		title: "Power of Attorney",
		status: "COMPLETED",
		workflow: "REN",
		enp: {
			name: "Atty. Ana Rodriguez",
			avatar: "/avatars/ana-rodriguez.jpg",
		},
		principal: {
			name: "Robert Johnson",
			email: "robert.johnson@email.com",
		},
		completedAt: "2024-01-13T11:15:00Z",
		duration: 30,
		documents: 3,
		location: "Remote Video Call",
		certificateUrl: "/certificates/not_3.pdf",
		recordingUrl: "/recordings/not_3.mp4",
	},
	{
		id: "not_4",
		title: "Will and Testament",
		status: "CANCELLED",
		workflow: "IEN",
		enp: {
			name: "Atty. Carlos Mendoza",
			avatar: "/avatars/carlos-mendoza.jpg",
		},
		principal: {
			name: "Maria Garcia",
			email: "maria.garcia@email.com",
		},
		cancelledAt: "2024-01-12T14:20:00Z",
		duration: 0,
		documents: 1,
		location: "456 Oak St, Quezon City",
		cancellationReason: "Client cancelled due to schedule conflict",
	},
	{
		id: "not_5",
		title: "Marriage Contract",
		status: "COMPLETED",
		workflow: "IEN",
		enp: {
			name: "Atty. Maria Santos",
			avatar: "/avatars/maria-santos.jpg",
		},
		principal: {
			name: "David Wilson",
			email: "david.wilson@email.com",
		},
		completedAt: "2024-01-11T09:30:00Z",
		duration: 50,
		documents: 2,
		location: "789 Pine St, Cebu City",
		certificateUrl: "/certificates/not_5.pdf",
		recordingUrl: null,
	},
]

export default function NotarizationHistoryPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")
	const [dateFilter, setDateFilter] = useState("ALL")
	const [activeTab, setActiveTab] = useState("all")

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return <CheckCircle className="h-4 w-4 text-green-600" />
			case "CANCELLED":
				return <XCircle className="h-4 w-4 text-red-600" />
			default:
				return <Clock className="h-4 w-4 text-gray-600" />
		}
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>
			case "CANCELLED":
				return <Badge variant="destructive">Cancelled</Badge>
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	const getWorkflowBadge = (workflow: string) => {
		return (
			<Badge variant="outline" className={workflow === "REN" ? "text-blue-600 border-blue-600" : "text-green-600 border-green-600"}>
				{workflow}
			</Badge>
		)
	}

	const filteredNotarizations = mockNotarizationHistory.filter(notarization => {
		const matchesSearch = notarization.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			notarization.enp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			notarization.principal.name.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesStatus = statusFilter === "ALL" || notarization.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || notarization.workflow === workflowFilter
		
		let matchesDate = true
		if (dateFilter !== "ALL") {
			const notarizationDate = new Date(notarization.completedAt || notarization.cancelledAt!)
			const now = new Date()
			const daysDiff = Math.floor((now.getTime() - notarizationDate.getTime()) / (1000 * 60 * 60 * 24))
			
			switch (dateFilter) {
				case "TODAY":
					matchesDate = daysDiff === 0
					break
				case "WEEK":
					matchesDate = daysDiff <= 7
					break
				case "MONTH":
					matchesDate = daysDiff <= 30
					break
				case "YEAR":
					matchesDate = daysDiff <= 365
					break
			}
		}
		
		return matchesSearch && matchesStatus && matchesWorkflow && matchesDate
	})

	const completedNotarizations = filteredNotarizations.filter(n => n.status === "COMPLETED")
	const cancelledNotarizations = filteredNotarizations.filter(n => n.status === "CANCELLED")

	const handleDownloadCertificate = (certificateUrl: string) => {
		// Handle certificate download
		console.log("Downloading certificate:", certificateUrl)
		window.open(certificateUrl, "_blank")
	}

	const handleViewRecording = (recordingUrl: string) => {
		// Handle recording view
		console.log("Viewing recording:", recordingUrl)
		window.open(recordingUrl, "_blank")
	}

	const handleViewNotarization = (notarizationId: string) => {
		window.location.href = `/notarize/${notarizationId}`
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarizations", url: "/notarizations/active" },
					{ label: "History", url: "/notarizations/history" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Notarization History</h1>
						<p className="mt-2 text-muted-foreground">
							View your completed and cancelled notarization sessions
						</p>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								<Input
									placeholder="Search notarizations..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger>
										<SelectValue placeholder="All Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Status</SelectItem>
										<SelectItem value="COMPLETED">Completed</SelectItem>
										<SelectItem value="CANCELLED">Cancelled</SelectItem>
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
								<Select value={dateFilter} onValueChange={setDateFilter}>
									<SelectTrigger>
										<SelectValue placeholder="All Time" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Time</SelectItem>
										<SelectItem value="TODAY">Today</SelectItem>
										<SelectItem value="WEEK">This Week</SelectItem>
										<SelectItem value="MONTH">This Month</SelectItem>
										<SelectItem value="YEAR">This Year</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="all">All ({filteredNotarizations.length})</TabsTrigger>
							<TabsTrigger value="completed">Completed ({completedNotarizations.length})</TabsTrigger>
							<TabsTrigger value="cancelled">Cancelled ({cancelledNotarizations.length})</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-6">
							<div className="space-y-4">
								{filteredNotarizations.map((notarization) => (
									<Card key={notarization.id} className="hover:shadow-md transition-shadow">
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<h3 className="text-lg font-medium">{notarization.title}</h3>
														{getStatusBadge(notarization.status)}
														{getWorkflowBadge(notarization.workflow)}
													</div>
													
													<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															<span>{notarization.enp.name}</span>
														</div>
														<div className="flex items-center gap-1">
															<FileText className="h-4 w-4" />
															<span>{notarization.documents} document{notarization.documents !== 1 ? "s" : ""}</span>
														</div>
														<div className="flex items-center gap-1">
															<Calendar className="h-4 w-4" />
															<span>
																{notarization.status === "COMPLETED" 
																	? `Completed ${new Date(notarization.completedAt!).toLocaleDateString()}`
																	: `Cancelled ${new Date(notarization.cancelledAt!).toLocaleDateString()}`
																}
															</span>
														</div>
														{notarization.duration > 0 && (
															<div className="flex items-center gap-1">
																<Clock className="h-4 w-4" />
																<span>{notarization.duration} min</span>
															</div>
														)}
													</div>

													<div className="flex items-center gap-2 mb-4">
														{getStatusIcon(notarization.status)}
														<span className="text-sm">
															{notarization.status === "COMPLETED" && "Notarization completed successfully"}
															{notarization.status === "CANCELLED" && `Cancelled: ${notarization.cancellationReason}`}
														</span>
													</div>

													{/* Location */}
													<div className="text-sm text-muted-foreground mb-4">
														Location: {notarization.location}
													</div>

													{/* Participants */}
													<div className="flex items-center gap-4">
														<div className="flex items-center gap-2">
															<Avatar className="h-8 w-8">
																<AvatarImage src={notarization.enp.avatar} alt={notarization.enp.name} />
																<AvatarFallback>{notarization.enp.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
															</Avatar>
															<div className="text-sm">
																<p className="font-medium">{notarization.enp.name}</p>
																<p className="text-muted-foreground">ENP</p>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<Avatar className="h-8 w-8">
																<AvatarFallback>{notarization.principal.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
															</Avatar>
															<div className="text-sm">
																<p className="font-medium">{notarization.principal.name}</p>
																<p className="text-muted-foreground">Principal</p>
															</div>
														</div>
													</div>
												</div>

												<div className="flex items-center gap-2">
													{notarization.status === "COMPLETED" && (
														<>
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleDownloadCertificate(notarization.certificateUrl!)}
															>
																<Download className="mr-2 h-4 w-4" />
																Certificate
															</Button>
															{notarization.recordingUrl && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => handleViewRecording(notarization.recordingUrl!)}
																>
																	{notarization.workflow === "REN" ? (
																		<>
																			<Video className="mr-2 h-4 w-4" />
																			Recording
																		</>
																	) : (
																		<>
																			<Handshake className="mr-2 h-4 w-4" />
																			Details
																		</>
																	)}
																</Button>
															)}
														</>
													)}
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleViewNotarization(notarization.id)}
													>
														<Eye className="mr-2 h-4 w-4" />
														View Details
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								))}

								{filteredNotarizations.length === 0 && (
									<Card>
										<CardContent className="py-12 text-center">
											<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
											<h3 className="text-lg font-medium mb-2">No notarizations found</h3>
											<p className="text-muted-foreground">
												{searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL" || dateFilter !== "ALL"
													? "Try adjusting your search criteria or filters."
													: "You don't have any notarization history yet."
												}
											</p>
										</CardContent>
									</Card>
								)}
							</div>
						</TabsContent>

						<TabsContent value="completed" className="mt-6">
							<div className="space-y-4">
								{completedNotarizations.map((notarization) => (
									<Card key={notarization.id} className="hover:shadow-md transition-shadow">
										<CardContent className="p-6">
											{/* Same content as above but only for completed */}
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<h3 className="text-lg font-medium">{notarization.title}</h3>
														{getStatusBadge(notarization.status)}
														{getWorkflowBadge(notarization.workflow)}
													</div>
													
													<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															<span>{notarization.enp.name}</span>
														</div>
														<div className="flex items-center gap-1">
															<FileText className="h-4 w-4" />
															<span>{notarization.documents} document{notarization.documents !== 1 ? "s" : ""}</span>
														</div>
														<div className="flex items-center gap-1">
															<Calendar className="h-4 w-4" />
															<span>Completed {new Date(notarization.completedAt!).toLocaleDateString()}</span>
														</div>
														<div className="flex items-center gap-1">
															<Clock className="h-4 w-4" />
															<span>{notarization.duration} min</span>
														</div>
													</div>

													<div className="flex items-center gap-2 mb-4">
														<CheckCircle className="h-4 w-4 text-green-600" />
														<span className="text-sm text-green-600">Notarization completed successfully</span>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleDownloadCertificate(notarization.certificateUrl!)}
													>
														<Download className="mr-2 h-4 w-4" />
														Certificate
													</Button>
													{notarization.recordingUrl && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleViewRecording(notarization.recordingUrl!)}
														>
															<Video className="mr-2 h-4 w-4" />
															Recording
														</Button>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</TabsContent>

						<TabsContent value="cancelled" className="mt-6">
							<div className="space-y-4">
								{cancelledNotarizations.map((notarization) => (
									<Card key={notarization.id} className="hover:shadow-md transition-shadow">
										<CardContent className="p-6">
											{/* Same content as above but only for cancelled */}
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<h3 className="text-lg font-medium">{notarization.title}</h3>
														{getStatusBadge(notarization.status)}
														{getWorkflowBadge(notarization.workflow)}
													</div>
													
													<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															<span>{notarization.enp.name}</span>
														</div>
														<div className="flex items-center gap-1">
															<FileText className="h-4 w-4" />
															<span>{notarization.documents} document{notarization.documents !== 1 ? "s" : ""}</span>
														</div>
														<div className="flex items-center gap-1">
															<Calendar className="h-4 w-4" />
															<span>Cancelled {new Date(notarization.cancelledAt!).toLocaleDateString()}</span>
														</div>
													</div>

													<div className="flex items-center gap-2 mb-4">
														<XCircle className="h-4 w-4 text-red-600" />
														<span className="text-sm text-red-600">Cancelled: {notarization.cancellationReason}</span>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleViewNotarization(notarization.id)}
													>
														<Eye className="mr-2 h-4 w-4" />
														View Details
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</>
	)
}
