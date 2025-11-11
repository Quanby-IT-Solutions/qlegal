"use client"

import { useState, useMemo } from "react"
import { type Route } from "next"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
	Activity, 
	Calendar, 
	CheckCircle, 
	Clock, 
	FileText, 
	TrendingUp, 
	Users, 
	Video,
	ArrowRight,
	Loader2,
	CalendarClock,
	FilePlus,
	ClipboardList,
	FileCheck,
	UserCheck,
	BarChart3,
	PieChart as PieChartIcon,
	LineChart as LineChartIcon
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { 
	AreaChart, 
	Area, 
	BarChart, 
	Bar, 
	PieChart, 
	Pie, 
	Cell, 
	LineChart, 
	Line, 
	XAxis, 
	YAxis, 
	CartesianGrid, 
	Tooltip, 
	Legend, 
	ResponsiveContainer 
} from "recharts"

import { trpc } from "@/services/trpc/client"
import { SidebarTrigger } from "@/core/components/animate-ui/components/radix/sidebar"
import { Separator } from "@/core/components/ui/separator"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/features/home/components/ui/breadcrumb"

// Chart colors
const COLORS = {
	primary: "#3b82f6",
	secondary: "#8b5cf6",
	success: "#10b981",
	warning: "#f59e0b",
	danger: "#ef4444",
	info: "#06b6d4",
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"]

export default function DashboardPage() {
	const router = useRouter()
	const { data: session } = useSession()
	const userRole = session?.user?.role || "PRINCIPAL"
	const isENP = userRole === "ENP"
	const isPrincipal = userRole === "PRINCIPAL"

	// Fetch dashboard data
	const { data: statistics, isLoading: isLoadingStats } = trpc.dashboard.getStatistics.useQuery()
	const { data: upcomingAppointments, isLoading: isLoadingUpcoming } = trpc.dashboard.getUpcomingAppointments.useQuery({ limit: 5 })
	const { data: recentDocuments, isLoading: isLoadingDocuments } = trpc.dashboard.getRecentDocuments.useQuery({ limit: 5 })
	const { data: recentMeetings, isLoading: isLoadingMeetings } = trpc.dashboard.getRecentMeetings.useQuery({ limit: 5 })
	
	// Fetch chart data
	const { data: activityData, isLoading: isLoadingActivity } = trpc.dashboard.getActivitySummary.useQuery({ days: 30 })
	const { data: appointmentTypeData, isLoading: isLoadingAppointmentTypes } = trpc.dashboard.getAppointmentTypeDistribution.useQuery()
	const { data: appointmentStatusData, isLoading: isLoadingAppointmentStatus } = trpc.dashboard.getAppointmentStatusDistribution.useQuery()
	const { data: documentStatusData, isLoading: isLoadingDocumentStatus } = trpc.dashboard.getDocumentStatusDistribution.useQuery()

	// Process activity data for charts
	const activityChartData = useMemo(() => {
		if (!activityData) return []
		
		// Merge appointments and documents by date
		const dateMap = new Map<string, { date: string; appointments: number; documents: number }>()
		
		activityData.appointments.forEach(item => {
			dateMap.set(item.date, { date: item.date, appointments: item.count, documents: 0 })
		})
		
		activityData.documents.forEach(item => {
			const existing = dateMap.get(item.date)
			if (existing) {
				existing.documents = item.count
			} else {
				dateMap.set(item.date, { date: item.date, appointments: 0, documents: item.count })
			}
		})
		
		return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
	}, [activityData])

	// Process pie chart data
	const appointmentTypePieData = useMemo(() => {
		if (!appointmentTypeData) return []
		return appointmentTypeData.map(item => ({
			name: item.type?.replace(/_/g, ' ') || 'Unknown',
			value: item.count
		}))
	}, [appointmentTypeData])

	const appointmentStatusPieData = useMemo(() => {
		if (!appointmentStatusData) return []
		return appointmentStatusData.map(item => ({
			name: item.status || 'Unknown',
			value: item.count
		}))
	}, [appointmentStatusData])

	const documentStatusBarData = useMemo(() => {
		if (!documentStatusData) return []
		return documentStatusData.map(item => ({
			name: item.status || 'Unknown',
			count: item.count
		}))
	}, [documentStatusData])

	// Status badge variant helper
	const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
		switch (status) {
			case "COMPLETED":
			case "CONFIRMED":
				return "default"
			case "PENDING":
				return "secondary"
			case "CANCELLED":
				return "destructive"
			default:
				return "outline"
		}
	}

	// Statistics cards - role-based
	const statsCards = useMemo(() => {
		const baseStats = [
			{
				title: isENP ? "Total Clients" : "Total Appointments",
				value: statistics?.totalAppointments || 0,
				icon: isENP ? Users : Calendar,
				description: "All time",
				color: "text-blue-600",
				bgColor: "bg-blue-50",
			},
			{
				title: "Pending",
				value: statistics?.pendingAppointments || 0,
				icon: Clock,
				description: isENP ? "Pending requests" : "Awaiting confirmation",
				color: "text-orange-600",
				bgColor: "bg-orange-50",
			},
			{
				title: "Documents",
				value: statistics?.totalDocuments || 0,
				icon: FileText,
				description: "Total uploaded",
				color: "text-purple-600",
				bgColor: "bg-purple-50",
			},
		]

		// Add ENP-specific stat
		if (isENP) {
			baseStats.push({
				title: "Signature Requests",
				value: statistics?.pendingSignatureRequests || 0,
				icon: FileCheck,
				description: "Pending signatures",
				color: "text-pink-600",
				bgColor: "bg-pink-50",
			})
		} else {
			baseStats.push({
				title: "Completed",
				value: statistics?.completedAppointments || 0,
				icon: CheckCircle,
				description: "Successfully finished",
				color: "text-green-600",
				bgColor: "bg-green-50",
			})
		}

		return baseStats
	}, [statistics, isENP])

	return (
		<div className="flex flex-1 flex-col">
			{/* Header */}
			<header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbPage>Dashboard</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					{/* Welcome Section */}
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							{isENP ? "ENP Dashboard" : "Dashboard"}
						</h1>
						<p className="mt-2 text-muted-foreground">
							{isENP 
								? "Welcome back! Manage your clients and track your notarization services." 
								: "Welcome back! Here's an overview of your notarization activities."
							}
						</p>
					</div>

					{/* Statistics Cards */}
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{isLoadingStats ? (
							Array.from({ length: 4 }).map((_, i) => (
								<Card key={i}>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-4 rounded-full" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-8 w-16" />
										<Skeleton className="mt-2 h-3 w-32" />
									</CardContent>
								</Card>
							))
						) : (
							statsCards.map((stat, index) => {
								const Icon = stat.icon
								return (
									<Card key={index}>
										<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
											<CardTitle className="text-sm font-medium">
												{stat.title}
											</CardTitle>
											<div className={`rounded-full p-2 ${stat.bgColor}`}>
												<Icon className={`h-4 w-4 ${stat.color}`} />
											</div>
										</CardHeader>
										<CardContent>
											<div className="text-2xl font-bold">{stat.value}</div>
											<p className="text-xs text-muted-foreground">
												{stat.description}
											</p>
										</CardContent>
									</Card>
								)
							})
						)}
					</div>

					{/* Quick Actions */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>
								Common tasks to get you started
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{isPrincipal && (
									<Button
										variant="outline"
										className="h-auto flex-col items-start gap-2 p-4"
										onClick={() => router.push("/find-notary" as Route)}
									>
										<Users className="h-5 w-5" />
										<div className="text-left">
											<div className="font-semibold">Find a Notary</div>
											<div className="text-xs text-muted-foreground">
												Search for available notaries
											</div>
										</div>
									</Button>
								)}
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/consultations" as Route)}
								>
									<CalendarClock className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">{isENP ? "View Requests" : "Book Consultation"}</div>
										<div className="text-xs text-muted-foreground">
											{isENP ? "Manage consultation requests" : "Schedule a consultation"}
										</div>
									</div>
								</Button>
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/envelopes" as Route)}
								>
									<FilePlus className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">Upload Document</div>
										<div className="text-xs text-muted-foreground">
											Create new envelope
										</div>
									</div>
								</Button>
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/appointments" as Route)}
								>
									<ClipboardList className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">View Appointments</div>
										<div className="text-xs text-muted-foreground">
											Manage your schedule
										</div>
									</div>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Analytics & Charts Section */}
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Activity Trend Chart */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<LineChartIcon className="h-5 w-5" />
											Activity Trend
										</CardTitle>
										<CardDescription>
											Last 30 days activity overview
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingActivity ? (
									<Skeleton className="h-[300px] w-full" />
								) : activityChartData.length > 0 ? (
									<ResponsiveContainer width="100%" height={300}>
										<AreaChart data={activityChartData}>
											<defs>
												<linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
													<stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
												</linearGradient>
												<linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
													<stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis 
												dataKey="date" 
												tick={{ fontSize: 12 }}
												tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
											/>
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip 
												labelFormatter={(value) => format(parseISO(value as string), 'PPP')}
											/>
											<Legend />
											<Area 
												type="monotone" 
												dataKey="appointments" 
												stroke={COLORS.primary} 
												fillOpacity={1} 
												fill="url(#colorAppointments)" 
												name="Appointments"
											/>
											<Area 
												type="monotone" 
												dataKey="documents" 
												stroke={COLORS.secondary} 
												fillOpacity={1} 
												fill="url(#colorDocuments)" 
												name="Documents"
											/>
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-[300px] items-center justify-center text-muted-foreground">
										No activity data yet
									</div>
								)}
							</CardContent>
						</Card>

						{/* Appointment Status Distribution */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<PieChartIcon className="h-5 w-5" />
											Appointment Status
										</CardTitle>
										<CardDescription>
											Distribution by status
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingAppointmentStatus ? (
									<Skeleton className="h-[300px] w-full" />
								) : appointmentStatusPieData.length > 0 ? (
									<ResponsiveContainer width="100%" height={300}>
										<PieChart>
											<Pie
												data={appointmentStatusPieData}
												cx="50%"
												cy="50%"
												labelLine={false}
												label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
												outerRadius={80}
												fill="#8884d8"
												dataKey="value"
											>
												{appointmentStatusPieData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
												))}
											</Pie>
											<Tooltip />
										</PieChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-[300px] items-center justify-center text-muted-foreground">
										No appointment data yet
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Additional Charts Row */}
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Appointment Type Distribution */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<BarChart3 className="h-5 w-5" />
											Appointment Types
										</CardTitle>
										<CardDescription>
											Distribution by type
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingAppointmentTypes ? (
									<Skeleton className="h-[300px] w-full" />
								) : appointmentTypePieData.length > 0 ? (
									<ResponsiveContainer width="100%" height={300}>
										<BarChart data={appointmentTypePieData}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="name" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip />
											<Legend />
											<Bar dataKey="value" fill={COLORS.primary} name="Count" radius={[8, 8, 0, 0]}>
												{appointmentTypePieData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-[300px] items-center justify-center text-muted-foreground">
										No appointment type data yet
									</div>
								)}
							</CardContent>
						</Card>

						{/* Document Status Distribution */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<FileText className="h-5 w-5" />
											Document Status
										</CardTitle>
										<CardDescription>
											Documents by status
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingDocumentStatus ? (
									<Skeleton className="h-[300px] w-full" />
								) : documentStatusBarData.length > 0 ? (
									<ResponsiveContainer width="100%" height={300}>
										<BarChart data={documentStatusBarData}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="name" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip />
											<Legend />
											<Bar dataKey="count" fill={COLORS.success} name="Documents" radius={[8, 8, 0, 0]}>
												{documentStatusBarData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-[300px] items-center justify-center text-muted-foreground">
										No document data yet
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Two Column Layout */}
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Upcoming Appointments */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>{isENP ? "Upcoming Client Appointments" : "Upcoming Appointments"}</CardTitle>
										<CardDescription>
											{isENP ? "Your scheduled client consultations" : "Your scheduled consultations"}
										</CardDescription>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => router.push("/appointments" as Route)}
									>
										View All
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingUpcoming ? (
									<div className="space-y-4">
										{Array.from({ length: 3 }).map((_, i) => (
											<div key={i} className="flex items-start gap-4">
												<Skeleton className="h-10 w-10 rounded-full" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-32" />
													<Skeleton className="h-3 w-full" />
												</div>
											</div>
										))}
									</div>
								) : upcomingAppointments && upcomingAppointments.length > 0 ? (
									<div className="space-y-4">
										{upcomingAppointments.map((appointment) => (
											<div
												key={appointment.id}
												className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
											>
												<Avatar className="h-10 w-10">
													<AvatarImage
														src={appointment.lawyerImage || undefined}
														alt={appointment.lawyerName || "Notary"}
													/>
													<AvatarFallback>
														{appointment.lawyerName
															?.split(" ")
															.map((n) => n[0])
															.join("") || "N"}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<p className="font-medium">
															{appointment.lawyerName}
														</p>
														<Badge variant={getStatusVariant(appointment.status)}>
															{appointment.status}
														</Badge>
													</div>
													<p className="text-sm text-muted-foreground">
														{appointment.type}
													</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<Calendar className="h-3 w-3" />
														{format(new Date(appointment.appointmentDate), "PPp")}
													</div>
													{appointment.location && (
														<p className="text-xs text-muted-foreground">
															📍 {appointment.location}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<Calendar className="h-12 w-12 text-muted-foreground/50" />
										<p className="mt-4 text-sm text-muted-foreground">
											No upcoming appointments
										</p>
										<Button
											variant="outline"
											size="sm"
											className="mt-4"
											onClick={() => router.push("/consultations" as Route)}
										>
											Book Consultation
										</Button>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Recent Documents */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Recent Documents</CardTitle>
										<CardDescription>
											Your latest uploaded files
										</CardDescription>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => router.push("/envelopes" as Route)}
									>
										View All
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingDocuments ? (
									<div className="space-y-4">
										{Array.from({ length: 3 }).map((_, i) => (
											<div key={i} className="flex items-start gap-4">
												<Skeleton className="h-10 w-10 rounded" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-32" />
													<Skeleton className="h-3 w-full" />
												</div>
											</div>
										))}
									</div>
								) : recentDocuments && recentDocuments.length > 0 ? (
									<div className="space-y-4">
										{recentDocuments.map((document) => (
											<div
												key={document.id}
												className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
												onClick={() => router.push(`/envelopes/${document.envelopeId}` as Route)}
											>
												<div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50">
													<FileText className="h-5 w-5 text-blue-600" />
												</div>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<p className="font-medium">{document.name}</p>
														<Badge variant={getStatusVariant(document.status)}>
															{document.status}
														</Badge>
													</div>
													<p className="text-sm text-muted-foreground">
														{document.envelopeTitle}
													</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<Clock className="h-3 w-3" />
														{format(new Date(document.createdAt), "PPp")}
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<FileText className="h-12 w-12 text-muted-foreground/50" />
										<p className="mt-4 text-sm text-muted-foreground">
											No documents yet
										</p>
										<Button
											variant="outline"
											size="sm"
											className="mt-4"
											onClick={() => router.push("/envelopes" as Route)}
										>
											Upload Document
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Recent Meetings */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Recent Video Meetings</CardTitle>
									<CardDescription>
										Your latest video consultations
									</CardDescription>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => router.push("/meetings" as Route)}
								>
									View All
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{isLoadingMeetings ? (
								<div className="space-y-4">
									{Array.from({ length: 3 }).map((_, i) => (
										<Skeleton key={i} className="h-16 w-full" />
									))}
								</div>
							) : recentMeetings && recentMeetings.length > 0 ? (
								<div className="space-y-4">
									{recentMeetings.map((meeting) => (
										<div
											key={meeting.id}
											className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
										>
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
												<Video className="h-5 w-5 text-green-600" />
											</div>
											<div className="flex-1">
												<div className="flex items-center justify-between">
													<p className="font-medium">{meeting.title}</p>
													<Badge variant={getStatusVariant(meeting.status)}>
														{meeting.status}
													</Badge>
												</div>
												<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
													<Clock className="h-3 w-3" />
													{format(new Date(meeting.createdAt), "PPp")}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Video className="h-12 w-12 text-muted-foreground/50" />
									<p className="mt-4 text-sm text-muted-foreground">
										No video meetings yet
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}
