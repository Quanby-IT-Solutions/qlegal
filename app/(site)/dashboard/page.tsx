"use client"

import { type Route } from "next"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Legend as ChartLegend,
	Tooltip as ChartTooltip,
	Filler,
	LinearScale,
	LineElement,
	PointElement,
	Title,
} from "chart.js"
import { format, parseISO } from "date-fns"
import {
	ArrowRightIcon,
	BarChart3Icon,
	CalendarClockIcon,
	CalendarIcon,
	CheckCircleIcon,
	ClipboardListIcon,
	ClockIcon,
	FileCheckIcon,
	FilePlusIcon,
	FileTextIcon,
	LineChartIcon,
	PieChartIcon,
	UsersIcon,
	VideoIcon,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { Bar, Doughnut, Line } from "react-chartjs-2"

import { SidebarTrigger } from "@/core/components/animate-ui/components/radix/sidebar"
import { ModeToggle } from "@/core/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { trpc } from "@/services/trpc/client"

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/features/home/components/ui/breadcrumb"

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	ChartTooltip,
	ChartLegend,
	Filler
)

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
	const pathname = usePathname()
	const { data: session } = useSession()
	const userRole = session?.user?.role ?? "PRINCIPAL"
	const isENP = userRole === "ENP"
	const isPrincipal = userRole === "PRINCIPAL"

	// Track if ENP has viewed requests page to hide notification dot
	const [hasViewedRequests, setHasViewedRequests] = useState(false)

	// Broadcast KYC verification status to other tabs (0 API calls)
	const { broadcast } = useKycBroadcast()

	// Fetch dashboard data
	const { data: statistics, isLoading: isLoadingStats } = trpc.dashboard.getStatistics.useQuery()

	// Broadcast KYC_VERIFIED when dashboard loads with verified status
	useEffect(() => {
		if (session?.user?.kycStatus === "VERIFIED") {
			console.log("📢 Dashboard mounted with VERIFIED status - broadcasting to other tabs")
			broadcast({
				type: "KYC_VERIFIED",
				userId: session.user.id,
				timestamp: Date.now(),
			})
		}
	}, [session?.user?.kycStatus, session?.user?.id, broadcast])

	useEffect(() => {
		// Check if user has viewed requests page before
		// Show dot if there are pending requests and either:
		// 1. They haven't viewed the page yet, OR
		// 2. New requests came in since last view
		if (isENP && statistics) {
			const viewed = localStorage.getItem("enp_viewed_requests")
			const lastViewedCount = localStorage.getItem("enp_last_viewed_count")
			const currentCount = statistics.pendingNotarizationRequests ?? 0

			if (viewed === "true" && lastViewedCount) {
				const lastCount = parseInt(lastViewedCount, 10)
				// If count increased (new requests), show dot again
				if (currentCount > lastCount) {
					setHasViewedRequests(false)
				} else if (currentCount === 0) {
					// No pending requests, hide dot
					setHasViewedRequests(true)
				} else {
					// Same count, they've viewed it
					setHasViewedRequests(true)
				}
			} else {
				// Never viewed, show dot if there are pending requests
				setHasViewedRequests(currentCount === 0)
			}
		}
	}, [isENP, statistics])

	useEffect(() => {
		// Mark as viewed when ENP visits requests page (both /requests and /requests/incoming)
		if (isENP && (pathname === "/requests" || pathname === "/requests/incoming")) {
			const currentCount = statistics?.pendingNotarizationRequests ?? 0
			localStorage.setItem("enp_viewed_requests", "true")
			localStorage.setItem("enp_last_viewed_count", currentCount.toString())
			setHasViewedRequests(true)
		}
	}, [isENP, pathname, statistics?.pendingNotarizationRequests])
	const { data: upcomingAppointments, isLoading: isLoadingUpcoming } =
		trpc.dashboard.getUpcomingAppointments.useQuery({ limit: 5 })
	const { data: recentDocuments, isLoading: isLoadingDocuments } =
		trpc.dashboard.getRecentDocuments.useQuery({ limit: 5 })
	const { data: recentMeetings, isLoading: isLoadingMeetings } =
		trpc.dashboard.getRecentMeetings.useQuery({ limit: 5 })

	// Fetch chart data
	const { data: activityData, isLoading: isLoadingActivity } =
		trpc.dashboard.getActivitySummary.useQuery({ days: 30 })
	const { data: appointmentTypeData, isLoading: isLoadingAppointmentTypes } =
		trpc.dashboard.getAppointmentTypeDistribution.useQuery()
	const { data: appointmentStatusData, isLoading: isLoadingAppointmentStatus } =
		trpc.dashboard.getAppointmentStatusDistribution.useQuery()
	const { data: documentStatusData, isLoading: isLoadingDocumentStatus } =
		trpc.dashboard.getDocumentStatusDistribution.useQuery()

	// Process activity data for Chart.js
	const activityChartData = useMemo(() => {
		if (!activityData) return { labels: [], datasets: [] }

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

		const sortedData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))

		return {
			labels: sortedData.map(item => format(parseISO(item.date), "MMM dd")),
			datasets: [
				{
					label: "Appointments",
					data: sortedData.map(item => item.appointments),
					borderColor: COLORS.primary,
					backgroundColor: `${COLORS.primary}80`,
					fill: true,
					tension: 0.4,
				},
				{
					label: "Documents",
					data: sortedData.map(item => item.documents),
					borderColor: COLORS.secondary,
					backgroundColor: `${COLORS.secondary}80`,
					fill: true,
					tension: 0.4,
				},
			],
		}
	}, [activityData])

	// Modern gradient color palette for appointment types
	const appointmentTypeGradientColors = useMemo(
		() => [
			{ start: "#3b82f6", end: "#1d4ed8", shadow: "#1e40af" }, // Blue
			{ start: "#8b5cf6", end: "#6d28d9", shadow: "#5b21b6" }, // Purple
			{ start: "#10b981", end: "#059669", shadow: "#047857" }, // Green
			{ start: "#f59e0b", end: "#d97706", shadow: "#b45309" }, // Orange
			{ start: "#ef4444", end: "#dc2626", shadow: "#b91c1c" }, // Red
			{ start: "#06b6d4", end: "#0891b2", shadow: "#0e7490" }, // Cyan
			{ start: "#ec4899", end: "#db2777", shadow: "#be185d" }, // Pink
			{ start: "#14b8a6", end: "#0d9488", shadow: "#0f766e" }, // Teal
		],
		[]
	)

	// Process appointment type data for Horizontal Bar chart
	const appointmentTypeChartData = useMemo(() => {
		if (!appointmentTypeData || appointmentTypeData.length === 0) return null

		return {
			labels: appointmentTypeData.map(item => item.type?.replace(/_/g, " ") ?? "Unknown"),
			datasets: [
				{
					label: "Count",
					data: appointmentTypeData.map(item => item.count),
					backgroundColor: appointmentTypeData.map((_, index) => {
						const colors =
							appointmentTypeGradientColors[index % appointmentTypeGradientColors.length] ??
							appointmentTypeGradientColors[0]
						return colors?.start ?? "#3b82f6"
					}),
					borderColor: appointmentTypeData.map((_, index) => {
						const colors =
							appointmentTypeGradientColors[index % appointmentTypeGradientColors.length] ??
							appointmentTypeGradientColors[0]
						return colors?.end ?? "#1d4ed8"
					}),
					borderWidth: 2,
					borderRadius: 8,
					borderSkipped: false,
				},
			],
		}
	}, [appointmentTypeData, appointmentTypeGradientColors])

	// Process appointment status data for Chart.js
	const appointmentStatusChartData = useMemo(() => {
		if (!appointmentStatusData || appointmentStatusData.length === 0) return null

		return {
			labels: appointmentStatusData.map(item => item.status ?? "Unknown"),
			datasets: [
				{
					data: appointmentStatusData.map(item => item.count),
					backgroundColor: appointmentStatusData.map(
						(_, index) => PIE_COLORS[index % PIE_COLORS.length]
					),
					borderColor: "#fff",
					borderWidth: 2,
				},
			],
		}
	}, [appointmentStatusData])

	// Process document status data for Chart.js
	const documentStatusChartData = useMemo(() => {
		if (!documentStatusData || documentStatusData.length === 0) return null

		return {
			labels: documentStatusData.map(item => item.status ?? "Unknown"),
			datasets: [
				{
					label: "Documents",
					data: documentStatusData.map(item => item.count),
					backgroundColor: documentStatusData.map(
						(_, index) => PIE_COLORS[index % PIE_COLORS.length]
					),
					borderColor: "#fff",
					borderWidth: 1,
				},
			],
		}
	}, [documentStatusData])

	// Status badge variant helper
	const getStatusVariant = (
		status: string
	): "default" | "secondary" | "destructive" | "outline" => {
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
				value: statistics?.totalAppointments ?? 0,
				icon: isENP ? UsersIcon : CalendarIcon,
				description: "All time",
				color: "text-blue-600",
				bgColor: "bg-blue-50",
			},
			{
				title: "Pending",
				value: statistics?.pendingAppointments ?? 0,
				icon: ClockIcon,
				description: isENP ? "Pending requests" : "Awaiting confirmation",
				color: "text-orange-600",
				bgColor: "bg-orange-50",
			},
			{
				title: "Documents",
				value: statistics?.totalDocuments ?? 0,
				icon: FileTextIcon,
				description: "Total uploaded",
				color: "text-purple-600",
				bgColor: "bg-purple-50",
			},
		]

		// Add ENP-specific stats
		if (isENP) {
			baseStats.push({
				title: "Notarization Requests",
				value: statistics?.pendingNotarizationRequests ?? 0,
				icon: ClipboardListIcon,
				description: "Pending requests",
				color: "text-orange-600",
				bgColor: "bg-orange-50",
			})
			baseStats.push({
				title: "Signature Requests",
				value: statistics?.pendingSignatureRequests ?? 0,
				icon: FileCheckIcon,
				description: "Pending signatures",
				color: "text-pink-600",
				bgColor: "bg-pink-50",
			})
		} else {
			baseStats.push({
				title: "Completed",
				value: statistics?.completedAppointments ?? 0,
				icon: CheckCircleIcon,
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
				<div className="flex flex-1 items-center justify-between px-4">
					<div className="flex items-center gap-2">
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
					<ModeToggle />
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
						<p className="text-muted-foreground mt-2">
							{isENP
								? "Welcome back! Manage your clients and track your notarization services."
								: "Welcome back! Here's an overview of your notarization activities."}
						</p>
					</div>

					{/* Statistics Cards */}
					<div
						className={`grid gap-4 sm:grid-cols-2 ${isENP ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
					>
						{isLoadingStats
							? Array.from({ length: isENP ? 5 : 4 }).map((_, i) => (
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
							: statsCards.map((stat, index) => {
									const Icon = stat.icon
									const hasPendingRequests =
										isENP &&
										stat.title === "Notarization Requests" &&
										(statistics?.pendingNotarizationRequests ?? 0) > 0 &&
										!hasViewedRequests
									return (
										<Card key={index} className="relative overflow-visible">
											{hasPendingRequests && (
												<div className="border-background absolute -top-2 -right-2 z-20 h-4 w-4 animate-pulse rounded-full border-2 bg-red-500 shadow-lg" />
											)}
											<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
												<CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
												<div className={`rounded-full p-2 ${stat.bgColor}`}>
													<Icon className={`h-4 w-4 ${stat.color}`} />
												</div>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-bold">{stat.value}</div>
												<p className="text-muted-foreground text-xs">{stat.description}</p>
											</CardContent>
										</Card>
									)
								})}
					</div>

					{/* Quick Actions */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>Common tasks to get you started</CardDescription>
						</CardHeader>
						<CardContent>
							<div
								className={`grid gap-4 sm:grid-cols-2 ${isENP ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
							>
								{isPrincipal && (
									<Button
										variant="outline"
										className="h-auto flex-col items-start gap-2 p-4"
										onClick={() => router.push("/find-notary" as Route)}
									>
										<UsersIcon className="h-5 w-5" />
										<div className="text-left">
											<div className="font-semibold">Find a Notary</div>
											<div className="text-muted-foreground text-xs">
												Search for available notaries
											</div>
										</div>
									</Button>
								)}
								{isENP && (
									<Button
										variant="outline"
										className="relative h-auto flex-col items-start gap-2 overflow-visible p-4"
										onClick={() => {
											const currentCount = statistics?.pendingNotarizationRequests ?? 0
											localStorage.setItem("enp_viewed_requests", "true")
											localStorage.setItem("enp_last_viewed_count", currentCount.toString())
											setHasViewedRequests(true)
											router.push("/requests/incoming" as Route)
										}}
									>
										{(statistics?.pendingNotarizationRequests ?? 0) > 0 && !hasViewedRequests && (
											<div className="border-background absolute -top-2 -right-2 z-20 h-4 w-4 animate-pulse rounded-full border-2 bg-red-500 shadow-lg" />
										)}
										<ClipboardListIcon className="h-5 w-5" />
										<div className="text-left">
											<div className="font-semibold">Notarization Requests</div>
											<div className="text-muted-foreground text-xs">
												{statistics?.pendingNotarizationRequests ?? 0} pending request
												{statistics?.pendingNotarizationRequests !== 1 ? "s" : ""}
											</div>
										</div>
									</Button>
								)}
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/consultations" as Route)}
								>
									<CalendarClockIcon className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">
											{isENP ? "View Consultations" : "Book Consultation"}
										</div>
										<div className="text-muted-foreground text-xs">
											{isENP ? "Manage consultation requests" : "Schedule a consultation"}
										</div>
									</div>
								</Button>
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/envelopes" as Route)}
								>
									<FilePlusIcon className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">Upload Document</div>
										<div className="text-muted-foreground text-xs">Create new envelope</div>
									</div>
								</Button>
								<Button
									variant="outline"
									className="h-auto flex-col items-start gap-2 p-4"
									onClick={() => router.push("/appointments" as Route)}
								>
									<ClipboardListIcon className="h-5 w-5" />
									<div className="text-left">
										<div className="font-semibold">View Appointments</div>
										<div className="text-muted-foreground text-xs">Manage your schedule</div>
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
										<CardDescription>Last 30 days activity overview</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingActivity ? (
									<Skeleton className="h-[300px] w-full" />
								) : activityChartData.labels.length > 0 ? (
									<div className="h-[300px]">
										<Line
											data={activityChartData}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: {
													legend: {
														position: "top" as const,
													},
													tooltip: {
														mode: "index",
														intersect: false,
													},
												},
												scales: {
													x: {
														grid: {
															display: false,
														},
													},
													y: {
														beginAtZero: true,
													},
												},
											}}
										/>
									</div>
								) : (
									<div className="text-muted-foreground flex h-[300px] items-center justify-center">
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
										<CardDescription>Distribution by status</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingAppointmentStatus ? (
									<Skeleton className="h-[300px] w-full" />
								) : appointmentStatusChartData ? (
									<div className="h-[300px]">
										<Doughnut
											data={appointmentStatusChartData}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: {
													legend: {
														position: "bottom" as const,
													},
													tooltip: {
														callbacks: {
															label: context => {
																const label = context.label ?? ""
																const value = context.parsed
																const total = context.dataset.data.reduce(
																	(a: number, b: number) => a + b,
																	0
																)
																const percentage = ((value / total) * 100).toFixed(0)
																return `${label}: ${value} (${percentage}%)`
															},
														},
													},
												},
											}}
										/>
									</div>
								) : (
									<div className="text-muted-foreground flex h-[300px] items-center justify-center">
										No appointment data yet
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Additional Charts Row */}
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Appointment Type Distribution - Horizontal Bar Chart */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<BarChart3Icon className="h-5 w-5" />
											Appointment Types
										</CardTitle>
										<CardDescription>Distribution by type</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingAppointmentTypes ? (
									<Skeleton className="h-[350px] w-full" />
								) : appointmentTypeChartData ? (
									<div className="h-[350px]">
										<Bar
											data={appointmentTypeChartData}
											options={{
												indexAxis: "y" as const,
												responsive: true,
												maintainAspectRatio: false,
												animation: {
													duration: 1200,
													easing: "easeOutQuart",
												},
												interaction: {
													mode: "index" as const,
													intersect: false,
												},
												plugins: {
													legend: {
														display: false,
													},
													tooltip: {
														enabled: true,
														padding: 12,
														backgroundColor: "rgba(0, 0, 0, 0.85)",
														titleColor: "#fff",
														bodyColor: "#fff",
														borderColor: "rgba(255, 255, 255, 0.1)",
														borderWidth: 1,
														cornerRadius: 8,
														displayColors: true,
														callbacks: {
															title: context => {
																return context[0]?.label ?? ""
															},
															label: context => {
																if (!context.parsed) return ""
																const value = context.parsed.x!
																const numericData = context.dataset.data.filter(
																	(d): d is number => typeof d === "number"
																)
																const total = numericData.reduce((a, b) => a + b, 0)
																const percentage =
																	total > 0 ? ((value / total) * 100).toFixed(1) : "0"
																return `${value} appointment${value !== 1 ? "s" : ""} (${percentage}%)`
															},
															labelColor: context => {
																const backgroundColorArray = Array.isArray(
																	context.dataset.backgroundColor
																)
																	? context.dataset.backgroundColor
																	: []
																const backgroundColor = (
																	typeof backgroundColorArray[context.dataIndex] === "string"
																		? backgroundColorArray[context.dataIndex]
																		: "#3b82f6"
																) as string
																const borderColorArray = Array.isArray(context.dataset.borderColor)
																	? context.dataset.borderColor
																	: []
																const borderColor = (
																	typeof borderColorArray[context.dataIndex] === "string"
																		? borderColorArray[context.dataIndex]
																		: "#1d4ed8"
																) as string
																return {
																	borderColor,
																	backgroundColor,
																	borderWidth: 2,
																	borderRadius: 4,
																}
															},
														},
													},
												},
												scales: {
													x: {
														beginAtZero: true,
														border: {
															display: false,
														},
														grid: {
															color: "rgba(148, 163, 184, 0.1)",
														},
														ticks: {
															color: "#94a3b8",
															font: {
																size: 11,
															},
															padding: 8,
															callback(value) {
																return Number.isInteger(value) ? value : ""
															},
														},
													},
													y: {
														border: {
															display: false,
														},
														grid: {
															display: false,
														},
														ticks: {
															color: "#64748b",
															font: {
																size: 12,
															},
															padding: 10,
														},
													},
												},
											}}
											plugins={[
												{
													id: "valueLabels",
													afterDatasetsDraw: chart => {
														const ctx = chart.ctx
														chart.data.datasets.forEach((dataset, i) => {
															const meta = chart.getDatasetMeta(i)
															meta.data.forEach((bar: { x: number; y: number }, index: number) => {
																const value =
																	typeof dataset.data[index] === "number" ? dataset.data[index] : 0
																if (value > 0) {
																	const colors =
																		appointmentTypeGradientColors[
																			index % appointmentTypeGradientColors.length
																		] ?? appointmentTypeGradientColors[0]
																	ctx.save()
																	ctx.fillStyle = colors?.end ?? "#1e293b"
																	ctx.font = "bold 12px Inter, system-ui, sans-serif"
																	ctx.textAlign = "left"
																	ctx.textBaseline = "middle"
																	const x = (bar as { x: number }).x + 8
																	const y = (bar as { y: number }).y
																	ctx.fillText(value.toString(), x, y)
																	ctx.restore()
																}
															})
														})
													},
												},
											]}
										/>
									</div>
								) : (
									<div className="flex h-[350px] flex-col items-center justify-center text-center">
										<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-blue-200">
											<BarChart3Icon className="h-8 w-8 text-blue-600" />
										</div>
										<p className="font-semibold text-slate-900">No appointment type data</p>
										<p className="text-sm text-slate-600">
											Appointment type distribution will appear here
										</p>
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
											<FileTextIcon className="h-5 w-5" />
											Document Status
										</CardTitle>
										<CardDescription>Documents by status</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{isLoadingDocumentStatus ? (
									<Skeleton className="h-[300px] w-full" />
								) : documentStatusChartData ? (
									<div className="h-[300px]">
										<Bar
											data={documentStatusChartData}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: {
													legend: {
														display: false,
													},
													tooltip: {
														callbacks: {
															label: context => `Documents: ${context.parsed.y}`,
														},
													},
												},
												scales: {
													x: {
														grid: {
															display: false,
														},
													},
													y: {
														beginAtZero: true,
													},
												},
											}}
										/>
									</div>
								) : (
									<div className="text-muted-foreground flex h-[300px] items-center justify-center">
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
										<CardTitle>
											{isENP ? "Upcoming Client Appointments" : "Upcoming Appointments"}
										</CardTitle>
										<CardDescription>
											{isENP
												? "Your scheduled client consultations"
												: "Your scheduled consultations"}
										</CardDescription>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => router.push("/appointments" as Route)}
									>
										View All
										<ArrowRightIcon className="ml-2 h-4 w-4" />
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
										{upcomingAppointments.map(appointment => (
											<div
												key={appointment.id}
												className="hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
											>
												<Avatar className="h-10 w-10">
													<AvatarImage
														src={appointment.lawyerImage || undefined}
														alt={appointment.lawyerName || "Notary"}
													/>
													<AvatarFallback>
														{appointment.lawyerName
															?.split(" ")
															.map(n => n[0])
															.join("") || "N"}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<p className="font-medium">{appointment.lawyerName}</p>
														<Badge variant={getStatusVariant(appointment.status)}>
															{appointment.status}
														</Badge>
													</div>
													<p className="text-muted-foreground text-sm">{appointment.type}</p>
													<div className="text-muted-foreground flex items-center gap-2 text-xs">
														<CalendarIcon className="h-3 w-3" />
														{format(new Date(appointment.appointmentDate), "PPp")}
													</div>
													{appointment.location && (
														<p className="text-muted-foreground text-xs">
															📍 {appointment.location}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<CalendarIcon className="text-muted-foreground/50 h-12 w-12" />
										<p className="text-muted-foreground mt-4 text-sm">No upcoming appointments</p>
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
										<CardDescription>Your latest uploaded files</CardDescription>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => router.push("/envelopes" as Route)}
									>
										View All
										<ArrowRightIcon className="ml-2 h-4 w-4" />
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
										{recentDocuments.map(document => (
											<div
												key={document.id}
												className="hover:bg-muted/50 flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors"
												onClick={() => router.push(`/envelopes/${document.envelopeId}` as Route)}
											>
												<div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50">
													<FileTextIcon className="h-5 w-5 text-blue-600" />
												</div>
												<div className="flex-1 space-y-1">
													<div className="flex items-center justify-between">
														<p className="font-medium">{document.name}</p>
														<Badge variant={getStatusVariant(document.status)}>
															{document.status}
														</Badge>
													</div>
													<p className="text-muted-foreground text-sm">{document.envelopeTitle}</p>
													<div className="text-muted-foreground flex items-center gap-2 text-xs">
														<ClockIcon className="h-3 w-3" />
														{format(new Date(document.createdAt), "PPp")}
													</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<FileTextIcon className="text-muted-foreground/50 h-12 w-12" />
										<p className="text-muted-foreground mt-4 text-sm">No documents yet</p>
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
									<CardDescription>Your latest video consultations</CardDescription>
								</div>
								<Button variant="ghost" size="sm" onClick={() => router.push("/meetings" as Route)}>
									View All
									<ArrowRightIcon className="ml-2 h-4 w-4" />
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
									{recentMeetings.map(meeting => (
										<div
											key={meeting.id}
											className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
										>
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
												<VideoIcon className="h-5 w-5 text-green-600" />
											</div>
											<div className="flex-1">
												<div className="flex items-center justify-between">
													<p className="font-medium">{meeting.title}</p>
													<Badge variant={getStatusVariant(meeting.status)}>{meeting.status}</Badge>
												</div>
												<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
													<ClockIcon className="h-3 w-3" />
													{format(new Date(meeting.createdAt), "PPp")}
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<VideoIcon className="text-muted-foreground/50 h-12 w-12" />
									<p className="text-muted-foreground mt-4 text-sm">No video meetings yet</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}
