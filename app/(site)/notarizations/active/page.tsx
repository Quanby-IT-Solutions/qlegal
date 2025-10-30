"use client"

import { useState } from "react"
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Play, Video, Handshake, MapPin } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Progress } from "@/core/components/ui/progress"

// Mock data for active notarizations
const mockActiveNotarizations = [
	{
		id: "not_1",
		title: "Real Estate Purchase Agreement",
		status: "IN_PROGRESS",
		workflow: "REN",
		enp: {
			name: "Atty. Maria Santos",
			avatar: "/avatars/maria-santos.jpg",
		},
		principal: {
			name: "John Doe",
			email: "john.doe@email.com",
		},
		startedAt: "2024-01-15T10:00:00Z",
		estimatedDuration: 30,
		progress: 65,
		documents: 2,
		requirements: {
			identityVerified: true,
			videoRecording: true,
			documentsScanned: false,
			witnessPresent: false,
		},
		location: "Remote Video Call",
	},
	{
		id: "not_2",
		title: "Business Contract",
		status: "IN_PROGRESS",
		workflow: "IEN",
		enp: {
			name: "Atty. Juan Dela Cruz",
			avatar: "/avatars/juan-dela-cruz.jpg",
		},
		principal: {
			name: "Jane Smith",
			email: "jane.smith@email.com",
		},
		startedAt: "2024-01-15T14:30:00Z",
		estimatedDuration: 45,
		progress: 30,
		documents: 1,
		requirements: {
			identityVerified: true,
			documentsScanned: true,
			witnessPresent: false,
			videoRecording: false,
		},
		location: "123 Main St, Makati City",
	},
	{
		id: "not_3",
		title: "Power of Attorney",
		status: "PENDING_START",
		workflow: "REN",
		enp: {
			name: "Atty. Ana Rodriguez",
			avatar: "/avatars/ana-rodriguez.jpg",
		},
		principal: {
			name: "Robert Johnson",
			email: "robert.johnson@email.com",
		},
		scheduledAt: "2024-01-15T16:00:00Z",
		estimatedDuration: 30,
		progress: 0,
		documents: 3,
		requirements: {
			identityVerified: false,
			videoRecording: false,
			documentsScanned: false,
			witnessPresent: false,
		},
		location: "Remote Video Call",
	},
]

export default function ActiveNotarizationsPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "PENDING_START":
				return <Clock className="h-4 w-4 text-yellow-600" />
			case "IN_PROGRESS":
				return <AlertCircle className="h-4 w-4 text-blue-600" />
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
			case "PENDING_START":
				return <Badge variant="secondary">Pending Start</Badge>
			case "IN_PROGRESS":
				return <Badge variant="default">In Progress</Badge>
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

	const getRequirementsProgress = (requirements: any) => {
		const total = Object.keys(requirements).length
		const completed = Object.values(requirements).filter(Boolean).length
		return (completed / total) * 100
	}

	const filteredNotarizations = mockActiveNotarizations.filter(notarization => {
		const matchesSearch = notarization.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			notarization.enp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			notarization.principal.name.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesStatus = statusFilter === "ALL" || notarization.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || notarization.workflow === workflowFilter
		return matchesSearch && matchesStatus && matchesWorkflow
	})

	const handleStartNotarization = (notarizationId: string) => {
		window.location.href = `/notarize/${notarizationId}`
	}

	const handleViewNotarization = (notarizationId: string) => {
		window.location.href = `/notarize/${notarizationId}`
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarizations", url: "/notarizations/active" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Active Notarizations</h1>
						<p className="mt-2 text-muted-foreground">
							Manage your ongoing notarization sessions
						</p>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
										<SelectItem value="PENDING_START">Pending Start</SelectItem>
										<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
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
							</div>
						</CardContent>
					</Card>

					{/* Notarizations List */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">
								{filteredNotarizations.length} Active Notarization{filteredNotarizations.length !== 1 ? "s" : ""}
							</h2>
						</div>

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
														{notarization.status === "PENDING_START" 
															? `Scheduled ${new Date(notarization.scheduledAt!).toLocaleString()}`
															: `Started ${new Date(notarization.startedAt).toLocaleString()}`
														}
													</span>
												</div>
												<div className="flex items-center gap-1">
													<Clock className="h-4 w-4" />
													<span>~{notarization.estimatedDuration} min</span>
												</div>
											</div>

											<div className="flex items-center gap-2 mb-4">
												{getStatusIcon(notarization.status)}
												<span className="text-sm">
													{notarization.status === "PENDING_START" && "Waiting to start"}
													{notarization.status === "IN_PROGRESS" && "Notarization in progress"}
													{notarization.status === "COMPLETED" && "Notarization completed"}
													{notarization.status === "CANCELLED" && "Notarization cancelled"}
												</span>
											</div>

											{/* Progress Bar */}
											{notarization.status === "IN_PROGRESS" && (
												<div className="mb-4">
													<div className="flex items-center justify-between text-sm mb-2">
														<span>Overall Progress</span>
														<span>{notarization.progress}%</span>
													</div>
													<Progress value={notarization.progress} className="h-2" />
												</div>
											)}

											{/* Requirements Progress */}
											<div className="mb-4">
												<div className="flex items-center justify-between text-sm mb-2">
													<span>Requirements</span>
													<span>{Math.round(getRequirementsProgress(notarization.requirements))}%</span>
												</div>
												<Progress value={getRequirementsProgress(notarization.requirements)} className="h-2" />
											</div>

											{/* Location */}
											<div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
												<MapPin className="h-4 w-4" />
												<span>{notarization.location}</span>
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
											{notarization.status === "PENDING_START" && (
												<Button
													onClick={() => handleStartNotarization(notarization.id)}
													className="flex items-center gap-2"
												>
													<Play className="h-4 w-4" />
													Start Now
												</Button>
											)}
											
											{notarization.status === "IN_PROGRESS" && (
												<Button
													onClick={() => handleViewNotarization(notarization.id)}
													className="flex items-center gap-2"
												>
													{notarization.workflow === "REN" ? (
														<>
															<Video className="h-4 w-4" />
															Continue REN
														</>
													) : (
														<>
															<Handshake className="h-4 w-4" />
															Continue IEN
														</>
													)}
												</Button>
											)}
											
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleViewNotarization(notarization.id)}
											>
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
									<h3 className="text-lg font-medium mb-2">No active notarizations</h3>
									<p className="text-muted-foreground mb-4">
										{searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "You don't have any active notarization sessions at the moment."
										}
									</p>
									<Button onClick={() => window.location.href = "/requests/new"}>
										Create New Request
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
