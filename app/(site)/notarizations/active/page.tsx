"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User, Play, Video, Handshake, MapPin, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Progress } from "@/core/components/ui/progress"
import { Skeleton } from "@/core/components/ui/skeleton"

export default function ActiveNotarizationsPage() {
	const { data: session } = useSession()
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("ALL")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")

	// Fetch active appointments (CONFIRMED and PENDING that haven't been cancelled or completed)
	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery({
		// Don't filter by status - we'll filter in the component to get both PENDING and CONFIRMED
		limit: 100,
		offset: 0,
	})

	// Transform appointments to notarization format
	const notarizations = useMemo(() => {
		if (!appointments) return []

		// Filter to only include active appointments (PENDING or CONFIRMED, not CANCELLED or COMPLETED)
		const activeAppointments = appointments.filter(
			apt => apt.status === "PENDING" || apt.status === "CONFIRMED"
		)

		return activeAppointments.map((appointment) => {
			// Determine workflow: 
			// - REN if has meetingLink OR notes contain "Remote" keywords
			// - IEN if has location OR notes contain "In-Person" keywords
			const notesLower = (appointment.notes || "").toLowerCase()
			const hasRemoteKeywords = notesLower.includes("remote") || notesLower.includes("ren")
			const hasInPersonKeywords = notesLower.includes("in-person") || notesLower.includes("ien") || notesLower.includes("in person")
			
			let workflow: "REN" | "IEN"
			if (appointment.meetingLink) {
				workflow = "REN"
			} else if (appointment.location) {
				workflow = "IEN"
			} else if (hasRemoteKeywords && !hasInPersonKeywords) {
				workflow = "REN"
			} else if (hasInPersonKeywords && !hasRemoteKeywords) {
				workflow = "IEN"
			} else {
				// Default: if no clear indicator, check if notes mention remote
				workflow = hasRemoteKeywords ? "REN" : "IEN"
			}
			
			// Map appointment status to notarization status
			// CONFIRMED appointments that haven't started yet are PENDING_START
			// CONFIRMED appointments that have started are IN_PROGRESS
			const now = new Date()
			const appointmentDate = new Date(appointment.appointmentDate)
			const hasStarted = appointmentDate <= now
			const status = hasStarted ? "IN_PROGRESS" : "PENDING_START"

			// Get ENP and Principal based on user role
			const isENP = session?.user?.role === "ENP"
			const enp = appointment.lawyer
			const principal = appointment.client

			// Generate a better title from notes or use a default
			let title = ""
			if (appointment.notes) {
				// Try to extract a meaningful title from notes
				// Remove common prefixes like "Consultation Type:", "Workflow:", etc.
				const cleanedNotes = appointment.notes
					.replace(/Consultation Type:\s*/gi, "")
					.replace(/Workflow:\s*/gi, "")
					.replace(/Meeting Preference:\s*/gi, "")
					.replace(/Remote Electronic Notarization/gi, "REN")
					.replace(/In-Person Electronic Notarization/gi, "IEN")
					.trim()
				
				// If cleaned notes are still too long or contain multiple lines, use first meaningful part
				if (cleanedNotes.length > 60 || cleanedNotes.includes("\n")) {
					const firstLine = cleanedNotes.split("\n")[0]?.trim() || ""
					title = firstLine.length > 60 ? `${firstLine.substring(0, 57)}...` : firstLine
				} else {
					title = cleanedNotes
				}
			}
			
			// Fallback to a formatted title
			if (!title || title.length < 3) {
				const typeLabel = appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"
				title = `${typeLabel} - ${principal?.name || "Client"}`
			}

			// For now, we'll use placeholder requirements
			// TODO: Fetch actual requirements from a separate table or calculate from related data
			const requirements = {
				identityVerified: hasStarted,
				videoRecording: workflow === "REN" && hasStarted,
				documentsScanned: workflow === "IEN" && hasStarted,
				witnessPresent: false,
			}

			// Calculate progress (simplified - TODO: calculate from actual requirements)
			const requirementsProgress = Object.values(requirements).filter(Boolean).length
			const requirementsTotal = Object.keys(requirements).length
			const requirementsPercent = (requirementsProgress / requirementsTotal) * 100
			const overallProgress = hasStarted ? Math.min(requirementsPercent + 20, 100) : 0

			// Get document count (TODO: fetch from related documents/envelopes)
			const documents = 0 // Placeholder

			return {
				id: appointment.id,
				title,
				status,
				workflow,
				enp: {
					name: enp?.name || "Unknown ENP",
					avatar: enp?.image || undefined,
				},
				principal: {
					name: principal?.name || "Unknown Client",
					email: principal?.email || "",
				},
				startedAt: hasStarted ? appointment.appointmentDate.toISOString() : undefined,
				scheduledAt: !hasStarted ? appointment.appointmentDate.toISOString() : undefined,
				estimatedDuration: appointment.duration || 30,
				progress: overallProgress,
				documents,
				requirements,
				location: appointment.location || (workflow === "REN" ? "Remote Video Call" : "Location TBD"),
			}
		})
	}, [appointments, session?.user?.role])

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

	const filteredNotarizations = notarizations.filter(notarization => {
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
								{isLoading ? (
									<Skeleton className="h-6 w-48" />
								) : (
									<>
										{filteredNotarizations.length} Active Notarization{filteredNotarizations.length !== 1 ? "s" : ""}
									</>
								)}
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
						) : (
							filteredNotarizations.map((notarization) => (
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
															? `Scheduled ${format(new Date(notarization.scheduledAt!), "PPp")}`
															: `Started ${format(new Date(notarization.startedAt!), "PPp")}`
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
														<AvatarFallback>
															{notarization.enp.name.split(" ").map(n => n[0]).join("").toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="text-sm">
														<p className="font-medium">{notarization.enp.name}</p>
														<p className="text-muted-foreground">ENP</p>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Avatar className="h-8 w-8">
														<AvatarFallback>
														{notarization.principal.name.split(" ").map(n => n[0]).join("").toUpperCase()}
													</AvatarFallback>
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
						)))}

						{!isLoading && filteredNotarizations.length === 0 && (
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
