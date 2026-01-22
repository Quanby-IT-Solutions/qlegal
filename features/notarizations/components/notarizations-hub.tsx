"use client"

import { format } from "date-fns"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	Handshake,
	Loader2,
	MapPin,
	Play,
	Video,
	XCircle,
} from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

type NotarizationsTab = "active" | "history"
type WorkflowType = "REN" | "IEN"
type Appointment = RouterOutputs["appointments"]["getMyAppointments"][number]

type ActiveItem = {
	id: string
	title: string
	status: "UPCOMING" | "IN_PROGRESS"
	workflow: WorkflowType
	enp: { name: string; avatar?: string }
	principal: { name: string; email?: string }
	scheduledAt?: string
	startedAt?: string
	estimatedDuration: number
	progress: number
	documents: number
	requirements: {
		identityVerified: boolean
		videoRecording: boolean
		documentsScanned: boolean
		witnessPresent: boolean
	}
	location: string
}

type HistoryItem = {
	id: string
	title: string
	status: "COMPLETED" | "CANCELLED"
	workflow: WorkflowType
	enp: { name: string; avatar?: string }
	principal: { name: string; email?: string }
	completedAt?: string
	cancelledAt?: string
	duration: number
	documents: number
	location: string
	cancellationReason?: string
	certificateUrl?: string
	recordingUrl?: string
}

function inferWorkflow(appointment: Appointment): WorkflowType {
	const notesLower = (appointment.notes || "").toLowerCase()
	const hasRemoteKeywords = notesLower.includes("remote") || notesLower.includes("ren")
	const hasInPersonKeywords =
		notesLower.includes("in-person") || notesLower.includes("ien") || notesLower.includes("in person")

	if (appointment.meetingLink) return "REN"
	if (appointment.location) return "IEN"
	if (hasRemoteKeywords && !hasInPersonKeywords) return "REN"
	if (hasInPersonKeywords && !hasRemoteKeywords) return "IEN"
	return hasRemoteKeywords ? "REN" : "IEN"
}

function inferTitle(appointment: Appointment, principalName: string): string {
	let title = ""
	if (appointment.notes) {
		const cleanedNotes = appointment.notes
			.replace(/Consultation Type:\s*/gi, "")
			.replace(/Workflow:\s*/gi, "")
			.replace(/Meeting Preference:\s*/gi, "")
			.replace(/Remote Electronic Notarization/gi, "REN")
			.replace(/In-Person Electronic Notarization/gi, "IEN")
			.trim()

		if (cleanedNotes.length > 60 || cleanedNotes.includes("\n")) {
			const firstLine = cleanedNotes.split("\n")[0]?.trim() || ""
			title = firstLine.length > 60 ? `${firstLine.substring(0, 57)}...` : firstLine
		} else {
			title = cleanedNotes
		}
	}

	if (!title || title.length < 3) {
		const typeLabel = appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"
		title = `${typeLabel} - ${principalName || "Client"}`
	}

	return title
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0] ?? "")
		.join("")
		.toUpperCase()
}

function monthKey(date: Date): string {
	return format(date, "yyyy-MM")
}

function monthLabel(date: Date): string {
	return format(date, "MMMM yyyy")
}

function getRequirementsProgress(requirements: ActiveItem["requirements"]): number {
	const total = Object.keys(requirements).length
	const completed = Object.values(requirements).filter(Boolean).length
	return total === 0 ? 0 : (completed / total) * 100
}

export function NotarizationsHub({ initialTab }: { initialTab: NotarizationsTab }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { data: session } = useSession()

	const [tab, setTab] = useState<NotarizationsTab>(initialTab)
	const [searchTerm, setSearchTerm] = useState("")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | WorkflowType>("ALL")
	const [activeStatusFilter, setActiveStatusFilter] = useState<"ALL" | "UPCOMING" | "IN_PROGRESS">("ALL")
	const [historyStatusFilter, setHistoryStatusFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL")
	const [historyDateFilter, setHistoryDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR">("ALL")
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery({
		limit: 100,
		offset: 0,
	})

	const { data: sessionDetails, isLoading: isLoadingDetails } =
		trpc.appointments.getNotarizationSession.useQuery(
			{ sessionId: selectedSessionId! },
			{ enabled: !!selectedSessionId }
		)

	const isENP = session?.user?.role === "ENP"

	const { activeItems, historyItems } = useMemo(() => {
		if (!appointments) return { activeItems: [] as ActiveItem[], historyItems: [] as HistoryItem[] }

		const now = new Date()

		const toBaseFields = (appointment: Appointment) => {
			const workflow = inferWorkflow(appointment)
			const enp = appointment.lawyer
			const principal = appointment.client

			const principalName = principal?.name || "Client"
			const title = inferTitle(appointment, principalName)
			const documents = 0

			const location =
				appointment.location || (workflow === "REN" ? "Remote Video Call" : "Location TBD")

			return { workflow, enp, principal, title, documents, location, now }
		}

		const activeAppointments = appointments.filter(
			apt => apt.status === "PENDING" || apt.status === "CONFIRMED"
		)
		const historyAppointments = appointments.filter(
			apt => apt.status === "COMPLETED" || apt.status === "CANCELLED"
		)

		const active = activeAppointments.map(appointment => {
			const base = toBaseFields(appointment)
			const appointmentDate = new Date(appointment.appointmentDate)
			const hasStarted = appointmentDate <= base.now

			const requirements = {
				identityVerified: hasStarted,
				videoRecording: base.workflow === "REN" && hasStarted,
				documentsScanned: base.workflow === "IEN" && hasStarted,
				witnessPresent: false,
			}

			const requirementsProgress = Object.values(requirements).filter(Boolean).length
			const requirementsTotal = Object.keys(requirements).length
			const requirementsPercent =
				requirementsTotal === 0 ? 0 : (requirementsProgress / requirementsTotal) * 100
			const overallProgress = hasStarted ? Math.min(requirementsPercent + 20, 100) : 0

			return {
				id: appointment.id,
				title: base.title,
				status: hasStarted ? "IN_PROGRESS" : "UPCOMING",
				workflow: base.workflow,
				enp: {
					name: base.enp?.name || "Unknown ENP",
					avatar: base.enp?.image || undefined,
				},
				principal: {
					name: base.principal?.name || "Unknown Client",
					email: base.principal?.email || "",
				},
				startedAt: hasStarted ? appointment.appointmentDate.toISOString() : undefined,
				scheduledAt: !hasStarted ? appointment.appointmentDate.toISOString() : undefined,
				estimatedDuration: appointment.duration || 30,
				progress: overallProgress,
				documents: base.documents,
				requirements,
				location: base.location,
			} satisfies ActiveItem
		})

		const history = historyAppointments.map(appointment => {
			const base = toBaseFields(appointment)
			const duration = appointment.duration || 30

			return {
				id: appointment.id,
				title: base.title,
				status: appointment.status as "COMPLETED" | "CANCELLED",
				workflow: base.workflow,
				enp: {
					name: base.enp?.name || "Unknown ENP",
					avatar: base.enp?.image || undefined,
				},
				principal: {
					name: base.principal?.name || "Unknown Client",
					email: base.principal?.email || "",
				},
				completedAt: appointment.status === "COMPLETED" ? appointment.updatedAt.toISOString() : undefined,
				cancelledAt: appointment.status === "CANCELLED" ? appointment.updatedAt.toISOString() : undefined,
				duration,
				documents: base.documents,
				location: base.location,
				cancellationReason: appointment.cancelReason || undefined,
				certificateUrl: undefined,
				recordingUrl: appointment.status === "COMPLETED" && base.workflow === "REN" ? undefined : undefined,
			} satisfies HistoryItem
		})

		return { activeItems: active, historyItems: history }
	}, [appointments])

	const sharedSearchFilter = (title: string, enpName: string, principalName: string) => {
		const q = searchTerm.trim().toLowerCase()
		if (!q) return true
		return (
			title.toLowerCase().includes(q) ||
			enpName.toLowerCase().includes(q) ||
			principalName.toLowerCase().includes(q)
		)
	}

	const filteredActive = useMemo(() => {
		return activeItems.filter(item => {
			if (!sharedSearchFilter(item.title, item.enp.name, item.principal.name)) return false
			if (workflowFilter !== "ALL" && item.workflow !== workflowFilter) return false
			if (activeStatusFilter !== "ALL" && item.status !== activeStatusFilter) return false
			return true
		})
	}, [activeItems, activeStatusFilter, workflowFilter, searchTerm])

	const filteredHistory = useMemo(() => {
		return historyItems.filter(item => {
			if (!sharedSearchFilter(item.title, item.enp.name, item.principal.name)) return false
			if (workflowFilter !== "ALL" && item.workflow !== workflowFilter) return false
			if (historyStatusFilter !== "ALL" && item.status !== historyStatusFilter) return false

			if (historyDateFilter === "ALL") return true
			const date = new Date(item.completedAt || item.cancelledAt || new Date().toISOString())
			const now = new Date()
			const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

			switch (historyDateFilter) {
				case "TODAY":
					return daysDiff === 0
				case "WEEK":
					return daysDiff <= 7
				case "MONTH":
					return daysDiff <= 30
				case "YEAR":
					return daysDiff <= 365
				default:
					return true
			}
		})
	}, [historyItems, historyDateFilter, historyStatusFilter, workflowFilter, searchTerm])

	const activeUpcoming = filteredActive.filter(item => item.status === "UPCOMING")
	const activeInProgress = filteredActive.filter(item => item.status === "IN_PROGRESS")

	const historyGrouped = useMemo(() => {
		const map = new Map<string, { label: string; items: HistoryItem[] }>()
		for (const item of filteredHistory) {
			const date = new Date(item.completedAt || item.cancelledAt || new Date().toISOString())
			const key = monthKey(date)
			const existing = map.get(key)
			if (!existing) {
				map.set(key, { label: monthLabel(date), items: [item] })
			} else {
				existing.items.push(item)
			}
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => b.localeCompare(a))
			.map(([, value]) => value)
	}, [filteredHistory])

	const onTabChange = (nextTab: NotarizationsTab) => {
		setTab(nextTab)
		const params = new URLSearchParams(searchParams?.toString())
		params.set("tab", nextTab)
		router.replace(`/notarizations?${params.toString()}`)
	}

	const workflowBadge = (workflow: WorkflowType) => (
		<Badge
			variant="outline"
			className={workflow === "REN" ? "border-blue-600 text-blue-600" : "border-green-600 text-green-600"}
		>
			{workflow}
		</Badge>
	)

	const activeStatusBadge = (status: ActiveItem["status"]) => {
		if (status === "UPCOMING") return <Badge variant="secondary">Upcoming</Badge>
		return <Badge variant="default">In Progress</Badge>
	}

	const historyStatusBadge = (status: HistoryItem["status"]) => {
		if (status === "COMPLETED") {
			return (
				<Badge variant="outline" className="border-green-600 text-green-600">
					Completed
				</Badge>
			)
		}
		return <Badge variant="destructive">Cancelled</Badge>
	}

	const openDetails = (id: string) => setSelectedSessionId(id)

	const goToNotarize = (id: string) => {
		window.location.href = `/notarize/${id}`
	}

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Notarizations", href: "/notarizations" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Notarizations</h1>
						<p className="text-muted-foreground">
							Track upcoming sessions, continue in-progress notarizations, and review your history.
						</p>
					</div>

					<Card>
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								<Input
									placeholder="Search by title, ENP, or principal..."
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
								/>

								<Select value={workflowFilter} onValueChange={value => setWorkflowFilter(value as any)}>
									<SelectTrigger>
										<SelectValue placeholder="All Workflows" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Workflows</SelectItem>
										<SelectItem value="REN">REN (Remote)</SelectItem>
										<SelectItem value="IEN">IEN (In-Person)</SelectItem>
									</SelectContent>
								</Select>

								{tab === "active" ? (
									<Select
										value={activeStatusFilter}
										onValueChange={value => setActiveStatusFilter(value as any)}
									>
										<SelectTrigger>
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ALL">All Status</SelectItem>
											<SelectItem value="UPCOMING">Upcoming</SelectItem>
											<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<Select
										value={historyStatusFilter}
										onValueChange={value => setHistoryStatusFilter(value as any)}
									>
										<SelectTrigger>
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ALL">All Status</SelectItem>
											<SelectItem value="COMPLETED">Completed</SelectItem>
											<SelectItem value="CANCELLED">Cancelled</SelectItem>
										</SelectContent>
									</Select>
								)}

								{tab === "history" ? (
									<Select
										value={historyDateFilter}
										onValueChange={value => setHistoryDateFilter(value as any)}
									>
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
								) : (
									<div className="hidden md:block" />
								)}
							</div>
						</CardContent>
					</Card>

					<Tabs value={tab} onValueChange={value => onTabChange(value as NotarizationsTab)}>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="active">
								Active{" "}
								{isLoading ? "" : `(${activeItems.length})`}
							</TabsTrigger>
							<TabsTrigger value="history">
								History{" "}
								{isLoading ? "" : `(${historyItems.length})`}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="active" className="mt-6 space-y-6">
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
							) : filteredActive.length === 0 ? (
								<Card>
									<CardContent className="py-12 text-center">
										<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
										<h3 className="mb-2 text-lg font-medium">No active notarizations</h3>
										<p className="text-muted-foreground mb-4">
											Try adjusting your search or filters.
										</p>
										<Button onClick={() => (window.location.href = "/requests/new")}>
											Create New Request
										</Button>
									</CardContent>
								</Card>
							) : (
								<div className="space-y-8">
									{activeInProgress.length > 0 && (
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<h2 className="text-lg font-semibold">In progress</h2>
												<Badge variant="default">{activeInProgress.length}</Badge>
											</div>

											<div className="space-y-4">
												{activeInProgress.map(item => (
													<Card key={item.id} className="transition-shadow hover:shadow-md">
														<CardContent className="p-6">
															<div className="flex items-start justify-between gap-4">
																<div className="flex-1">
																	<div className="mb-2 flex flex-wrap items-center gap-3">
																		<h3 className="text-lg font-medium">{item.title}</h3>
																		{activeStatusBadge(item.status)}
																		{workflowBadge(item.workflow)}
																	</div>

																	<div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-4 text-sm">
																		<div className="flex items-center gap-1">
																			<UserIcon />
																			<span>{isENP ? item.principal.name : item.enp.name}</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<FileText className="h-4 w-4" />
																			<span>
																				{item.documents} document{item.documents !== 1 ? "s" : ""}
																			</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<Calendar className="h-4 w-4" />
																			<span>
																				Started {format(new Date(item.startedAt!), "PPp")}
																			</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<Clock className="h-4 w-4" />
																			<span>~{item.estimatedDuration} min</span>
																		</div>
																	</div>

																	<div className="mb-4 flex items-center gap-2 text-sm">
																		<AlertCircle className="h-4 w-4 text-blue-600" />
																		<span>Notarization in progress</span>
																	</div>

																	<div className="mb-4">
																		<div className="mb-2 flex items-center justify-between text-sm">
																			<span>Overall Progress</span>
																			<span>{item.progress}%</span>
																		</div>
																		<Progress value={item.progress} className="h-2" />
																	</div>

																	<div className="mb-4">
																		<div className="mb-2 flex items-center justify-between text-sm">
																			<span>Requirements</span>
																			<span>{Math.round(getRequirementsProgress(item.requirements))}%</span>
																		</div>
																		<Progress value={getRequirementsProgress(item.requirements)} className="h-2" />
																	</div>

																	<div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
																		<MapPin className="h-4 w-4" />
																		<span>{item.location}</span>
																	</div>

																	<div className="flex items-center gap-4">
																		<Participant
																			name={item.enp.name}
																			avatar={item.enp.avatar}
																			label="ENP"
																		/>
																		<Participant name={item.principal.name} label="Principal" />
																	</div>
																</div>

																<div className="flex shrink-0 flex-col gap-2">
																	<Button onClick={() => goToNotarize(item.id)} className="gap-2">
																		{item.workflow === "REN" ? (
																			<>
																				<Video className="h-4 w-4" />
																				Continue
																			</>
																		) : (
																			<>
																				<Handshake className="h-4 w-4" />
																				Continue
																			</>
																		)}
																	</Button>
																	<Button variant="outline" size="sm" onClick={() => openDetails(item.id)}>
																		View details
																	</Button>
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									)}

									{activeUpcoming.length > 0 && (
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<h2 className="text-lg font-semibold">Upcoming</h2>
												<Badge variant="secondary">{activeUpcoming.length}</Badge>
											</div>

											<div className="space-y-4">
												{activeUpcoming.map(item => (
													<Card key={item.id} className="transition-shadow hover:shadow-md">
														<CardContent className="p-6">
															<div className="flex items-start justify-between gap-4">
																<div className="flex-1">
																	<div className="mb-2 flex flex-wrap items-center gap-3">
																		<h3 className="text-lg font-medium">{item.title}</h3>
																		{activeStatusBadge(item.status)}
																		{workflowBadge(item.workflow)}
																	</div>

																	<div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-4 text-sm">
																		<div className="flex items-center gap-1">
																			<UserIcon />
																			<span>{isENP ? item.principal.name : item.enp.name}</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<Calendar className="h-4 w-4" />
																			<span>Scheduled {format(new Date(item.scheduledAt!), "PPp")}</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<Clock className="h-4 w-4" />
																			<span>~{item.estimatedDuration} min</span>
																		</div>
																	</div>

																	<div className="mb-4 flex items-center gap-2 text-sm">
																		<Clock className="h-4 w-4 text-yellow-600" />
																		<span>Waiting to start</span>
																	</div>

																	<div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
																		<MapPin className="h-4 w-4" />
																		<span>{item.location}</span>
																	</div>
																</div>

																<div className="flex shrink-0 flex-col gap-2">
																	<Button onClick={() => goToNotarize(item.id)} className="gap-2">
																		<Play className="h-4 w-4" />
																		Start
																	</Button>
																	<Button variant="outline" size="sm" onClick={() => openDetails(item.id)}>
																		View details
																	</Button>
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="history" className="mt-6 space-y-6">
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
							) : filteredHistory.length === 0 ? (
								<Card>
									<CardContent className="py-12 text-center">
										<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
										<h3 className="mb-2 text-lg font-medium">No notarizations found</h3>
										<p className="text-muted-foreground">Try adjusting your search or filters.</p>
									</CardContent>
								</Card>
							) : (
								<div className="space-y-8">
									{historyGrouped.map(group => (
										<div key={group.label} className="space-y-3">
											<div className="flex items-center justify-between">
												<h2 className="text-lg font-semibold">{group.label}</h2>
												<Badge variant="outline">{group.items.length}</Badge>
											</div>

											<div className="space-y-4">
												{group.items.map(item => (
													<Card key={item.id} className="transition-shadow hover:shadow-md">
														<CardContent className="p-6">
															<div className="flex items-start justify-between gap-4">
																<div className="flex-1">
																	<div className="mb-2 flex flex-wrap items-center gap-3">
																		<h3 className="text-lg font-medium">{item.title}</h3>
																		{historyStatusBadge(item.status)}
																		{workflowBadge(item.workflow)}
																	</div>

																	<div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-4 text-sm">
																		<div className="flex items-center gap-1">
																			<UserIcon />
																			<span>{isENP ? item.principal.name : item.enp.name}</span>
																		</div>
																		<div className="flex items-center gap-1">
																			<Calendar className="h-4 w-4" />
																			<span>
																				{item.status === "COMPLETED"
																					? `Completed ${format(new Date(item.completedAt!), "MMM dd, yyyy")}`
																					: `Cancelled ${format(new Date(item.cancelledAt!), "MMM dd, yyyy")}`}
																			</span>
																		</div>
																		{item.duration > 0 && (
																			<div className="flex items-center gap-1">
																				<Clock className="h-4 w-4" />
																				<span>{item.duration} min</span>
																			</div>
																		)}
																	</div>

																	<div className="mb-4 flex items-center gap-2 text-sm">
																		{item.status === "COMPLETED" ? (
																			<>
																				<CheckCircle className="h-4 w-4 text-green-600" />
																				<span className="text-green-600">Completed successfully</span>
																			</>
																		) : (
																			<>
																				<XCircle className="h-4 w-4 text-red-600" />
																				<span className="text-red-600">
																					Cancelled{item.cancellationReason ? `: ${item.cancellationReason}` : ""}
																				</span>
																			</>
																		)}
																	</div>

																	<div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
																		<MapPin className="h-4 w-4" />
																		<span>{item.location}</span>
																	</div>

																	<div className="flex items-center gap-4">
																		<Participant
																			name={item.enp.name}
																			avatar={item.enp.avatar}
																			label="ENP"
																		/>
																		<Participant name={item.principal.name} label="Principal" />
																	</div>
																</div>

																<div className="flex shrink-0 flex-col gap-2">
																	<Button variant="outline" onClick={() => goToNotarize(item.id)} className="gap-2">
																		<Eye className="h-4 w-4" />
																		View details
																	</Button>
																	{item.certificateUrl ? (
																		<Button
																			variant="outline"
																			onClick={() => window.open(item.certificateUrl, "_blank")}
																			className="gap-2"
																		>
																			<Download className="h-4 w-4" />
																			Certificate
																		</Button>
																	) : null}
																	{item.recordingUrl ? (
																		<Button
																			variant="outline"
																			onClick={() => window.open(item.recordingUrl, "_blank")}
																			className="gap-2"
																		>
																			<Video className="h-4 w-4" />
																			Recording
																		</Button>
																	) : null}
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</main>

			<Dialog
				open={!!selectedSessionId}
				onOpenChange={open => {
					if (!open) setSelectedSessionId(null)
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{isLoadingDetails
								? "Loading Notarization Details"
								: sessionDetails
									? sessionDetails.title
									: "Notarization Details"}
						</DialogTitle>
						{sessionDetails && (
							<DialogDescription>
								{sessionDetails.workflow === "REN"
									? "Remote Electronic Notarization (REN)"
									: "In-Person Electronic Notarization (IEN)"}
							</DialogDescription>
						)}
					</DialogHeader>

					{isLoadingDetails ? (
						<div className="py-8">
							<div className="flex items-center justify-center gap-2">
								<Loader2 className="h-5 w-5 animate-spin" />
								<span className="text-muted-foreground text-sm">Loading details...</span>
							</div>
						</div>
					) : sessionDetails ? (
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<Badge variant={sessionDetails.workflow === "REN" ? "default" : "secondary"}>
									{sessionDetails.workflow}
								</Badge>
							</div>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Session Information</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="text-muted-foreground">Status:</span>
											<Badge variant="default" className="ml-2">
												{sessionDetails.status}
											</Badge>
										</div>
										<div>
											<span className="text-muted-foreground">Location:</span>
											<span className="ml-2">{sessionDetails.location}</span>
										</div>
										<div>
											<span className="text-muted-foreground">Started:</span>
											<span className="ml-2">{format(new Date(sessionDetails.startTime), "PPp")}</span>
										</div>
										<div>
											<span className="text-muted-foreground">Duration:</span>
											<span className="ml-2">~{sessionDetails.estimatedDuration} minutes</span>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Participants</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarImage
												src={sessionDetails.enp.avatar || undefined}
												alt={sessionDetails.enp.name}
											/>
											<AvatarFallback>{getInitials(sessionDetails.enp.name)}</AvatarFallback>
										</Avatar>
										<div className="flex-1">
											<p className="font-medium">{sessionDetails.enp.name}</p>
											<p className="text-muted-foreground text-sm">{sessionDetails.enp.title}</p>
											{sessionDetails.enp.email ? (
												<p className="text-muted-foreground text-sm">{sessionDetails.enp.email}</p>
											) : null}
											{sessionDetails.enp.phone ? (
												<p className="text-muted-foreground text-sm">{sessionDetails.enp.phone}</p>
											) : null}
										</div>
										<Badge variant="outline">ENP</Badge>
									</div>

									<Separator />

									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarFallback>{getInitials(sessionDetails.principal.name)}</AvatarFallback>
										</Avatar>
										<div className="flex-1">
											<p className="font-medium">{sessionDetails.principal.name}</p>
											<p className="text-muted-foreground text-sm">Principal</p>
											{sessionDetails.principal.email ? (
												<p className="text-muted-foreground text-sm">{sessionDetails.principal.email}</p>
											) : null}
											{sessionDetails.principal.phone ? (
												<p className="text-muted-foreground text-sm">{sessionDetails.principal.phone}</p>
											) : null}
										</div>
										<Badge variant="outline">Principal</Badge>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Documents</CardTitle>
									<CardDescription>
										{sessionDetails.documents.length} document
										{sessionDetails.documents.length !== 1 ? "s" : ""} to notarize
									</CardDescription>
								</CardHeader>
								<CardContent>
									{sessionDetails.documents.length > 0 ? (
										<div className="space-y-3">
											{sessionDetails.documents.map(doc => (
												<div
													key={doc.id}
													className="flex items-center justify-between rounded-lg border p-3"
												>
													<div className="flex items-center gap-3">
														<FileText className="h-8 w-8 text-blue-600" />
														<div>
															<h4 className="font-medium">{doc.name}</h4>
															<p className="text-muted-foreground text-sm">{doc.pages} pages</p>
														</div>
													</div>
													<Badge variant={doc.status === "PENDING_SIGNATURE" ? "secondary" : "default"}>
														{doc.status === "PENDING_SIGNATURE" ? "Pending" : "Completed"}
													</Badge>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground py-4 text-center text-sm">No documents uploaded yet</p>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Requirements Checklist</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm">
											{sessionDetails.workflow === "REN" ? "Remote identity verification" : "Physical ID verification"}
										</span>
										{sessionDetails.requirements.identityVerified ? (
											<CheckCircle className="h-5 w-5 text-green-600" />
										) : (
											<XCircle className="h-5 w-5 text-gray-400" />
										)}
									</div>
									{sessionDetails.workflow === "IEN" ? (
										<>
											<div className="flex items-center justify-between">
												<span className="text-sm">Physical documents scanned</span>
												{sessionDetails.requirements.documentsScanned ? (
													<CheckCircle className="h-5 w-5 text-green-600" />
												) : (
													<XCircle className="h-5 w-5 text-gray-400" />
												)}
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm">Witness present</span>
												{sessionDetails.requirements.witnessPresent ? (
													<CheckCircle className="h-5 w-5 text-green-600" />
												) : (
													<XCircle className="h-5 w-5 text-gray-400" />
												)}
											</div>
										</>
									) : (
										<div className="flex items-center justify-between">
											<span className="text-sm">Video/audio recording active</span>
											{sessionDetails.requirements.videoRecording ? (
												<CheckCircle className="h-5 w-5 text-green-600" />
											) : (
												<XCircle className="h-5 w-5 text-gray-400" />
											)}
										</div>
									)}

									<div className="border-t pt-4">
										<div className="mb-2 flex items-center justify-between text-sm">
											<span>Progress</span>
											<span>
												{Object.values(sessionDetails.requirements).filter(Boolean).length}/
												{Object.keys(sessionDetails.requirements).length}
											</span>
										</div>
										<Progress
											value={
												(Object.values(sessionDetails.requirements).filter(Boolean).length /
													Object.keys(sessionDetails.requirements).length) *
												100
											}
											className="h-2"
										/>
									</div>

									<div className="flex justify-end gap-2 pt-4">
										<Button variant="outline" onClick={() => setSelectedSessionId(null)}>
											Close
										</Button>
										<Button
											onClick={() => {
												const id = selectedSessionId
												setSelectedSessionId(null)
												if (id) goToNotarize(id)
											}}
											className="gap-2"
										>
											{sessionDetails.workflow === "REN" ? (
												<>
													<Video className="h-4 w-4" />
													Continue
												</>
											) : (
												<>
													<Handshake className="h-4 w-4" />
													Continue
												</>
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					) : (
						<div className="py-8 text-center">
							<AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
							<h3 className="mb-2 text-lg font-medium">Unable to load details</h3>
							<p className="text-muted-foreground mb-4 text-sm">
								Failed to load notarization session details.
							</p>
							<Button variant="outline" onClick={() => setSelectedSessionId(null)}>
								Close
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

function UserIcon() {
	return <AlertCircle className="h-4 w-4 text-muted-foreground" />
}

function Participant({
	name,
	avatar,
	label,
}: {
	name: string
	avatar?: string
	label: "ENP" | "Principal"
}) {
	return (
		<div className="flex items-center gap-2">
			<Avatar className="h-8 w-8">
				{avatar ? <AvatarImage src={avatar} alt={name} /> : null}
				<AvatarFallback>{getInitials(name)}</AvatarFallback>
			</Avatar>
			<div className="text-sm">
				<p className="font-medium">{name}</p>
				<p className="text-muted-foreground">{label}</p>
			</div>
		</div>
	)
}


