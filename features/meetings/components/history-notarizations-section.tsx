"use client"

import { useMemo, useState } from "react"
import { format, isAfter, isSameDay, subDays } from "date-fns"
import {
	Calendar,
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	MapPin,
	User,
	Video,
	XCircle,
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

type WorkflowType = "REN" | "IEN"
type Appointment = RouterOutputs["appointments"]["getMyAppointments"][number]

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
		notesLower.includes("in-person") ||
		notesLower.includes("ien") ||
		notesLower.includes("in person")

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

export function HistoryNotarizationsSection() {
	const { data: session } = useSession()
	const [searchTerm, setSearchTerm] = useState("")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | WorkflowType>("ALL")
	const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL")
	const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR">("ALL")

	const { data: meetingsData } = trpc.meetings.getUserMeetingsWithDocumentStats.useQuery({
		limit: 50,
		offset: 0,
	})

	const meetings = meetingsData?.items ?? []

	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery({
		limit: 50,
		offset: 0,
	})

	const isENP = session?.user?.role === "ENP"

	const historyItems = useMemo<HistoryItem[]>(() => {
		const items: HistoryItem[] = []

		meetings
			.filter(m => m.status === "COMPLETED")
			.forEach(m => {
				items.push({
					id: m.id,
					title: m.title,
					status: "COMPLETED",
					workflow: "REN", // meetings are remote notarizations

					enp: {
						name: m.createdBy?.name ?? "Unknown ENP",
						avatar: m.createdBy?.image ?? undefined,
					},

					principal: {
						name: m.participants?.find(p => p.user?.role === "PRINCIPAL")?.user?.name ?? "Client",
					},

					completedAt: new Date(m.updatedAt ?? m.createdAt).toISOString(),
					cancelledAt: undefined,
					duration: 30,
					documents: m.documentStats?.total ?? 0,
					location: "Remote Video Call",
					cancellationReason: undefined,
					certificateUrl: undefined,
					recordingUrl: undefined,
				})
			})

		if (appointments) {
			appointments
				.filter(a => a.status === "CANCELLED")
				.forEach(a => {
					const workflow: WorkflowType = a.meetingLink ? "REN" : "IEN"

					items.push({
						id: a.id,
						title:
							a.notes?.trim() ||
							`${a.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"} - ${
								a.client?.name ?? "Client"
							}`,
						status: "CANCELLED",
						workflow,

						enp: {
							name: a.lawyer?.name ?? "Unknown ENP",
							avatar: a.lawyer?.image ?? undefined,
						},

						principal: {
							name: a.client?.name ?? "Unknown Client",
							email: a.client?.email ?? undefined,
						},

						completedAt: undefined,
						cancelledAt: new Date(a.updatedAt).toISOString(),
						duration: a.duration ?? 30,
						documents: 0,
						location:
							a.location ?? (workflow === "REN" ? "Remote Video Call" : "In-Person Meeting"),
						cancellationReason: a.cancelReason ?? undefined,
						certificateUrl: undefined,
						recordingUrl: undefined,
					})
				})
		}

		return items
	}, [appointments, meetings])

	const filteredHistory = useMemo(() => {
		return historyItems.filter(item => {
			const q = searchTerm.trim().toLowerCase()
			if (
				q &&
				!item.title.toLowerCase().includes(q) &&
				!item.enp.name.toLowerCase().includes(q) &&
				!item.principal.name.toLowerCase().includes(q)
			) {
				return false
			}
			if (workflowFilter !== "ALL" && item.workflow !== workflowFilter) return false
			if (statusFilter !== "ALL" && item.status !== statusFilter) return false

			if (dateFilter === "ALL") return true
			const date = new Date(item.completedAt || item.cancelledAt!)
			const now = new Date()

			switch (dateFilter) {
				case "TODAY":
					return isSameDay(date, now)
				case "WEEK":
					return isAfter(date, subDays(now, 7))
				case "MONTH":
					return isAfter(date, subDays(now, 30))
				case "YEAR":
					return isAfter(date, subDays(now, 365))
				default:
					return true
			}
		})
	}, [historyItems, dateFilter, statusFilter, workflowFilter, searchTerm])

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

	const workflowBadge = (workflow: WorkflowType) => (
		<Badge
			variant="outline"
			className={
				workflow === "REN" ? "border-blue-600 text-blue-600" : "border-green-600 text-green-600"
			}
		>
			{workflow}
		</Badge>
	)

	const statusBadge = (status: HistoryItem["status"]) => {
		if (status === "COMPLETED") {
			return (
				<Badge variant="outline" className="border-green-600 text-green-600">
					Completed
				</Badge>
			)
		}
		return <Badge variant="destructive">Cancelled</Badge>
	}

	const handleViewNotarization = (id: string) => {
		window.location.href = `/notarize/${id}`
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Past</h2>
				<p className="text-muted-foreground text-sm">
					History of your completed and cancelled notarization sessions
				</p>
			</div>
			<h3 className="font-small pt-5 text-sm">
				{isLoading ? (
					<Skeleton className="h-6 w-48" />
				) : (
					<>
						{filteredHistory.length} Notarization{filteredHistory.length !== 1 ? "s" : ""} Found
					</>
				)}
			</h3>
			<Card>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
						<Input
							placeholder="Search notarizations..."
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
						<Select value={statusFilter} onValueChange={value => setStatusFilter(value as any)}>
							<SelectTrigger>
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Status</SelectItem>
								<SelectItem value="COMPLETED">Completed</SelectItem>
								<SelectItem value="CANCELLED">Cancelled</SelectItem>
							</SelectContent>
						</Select>
						<Select value={dateFilter} onValueChange={value => setDateFilter(value as any)}>
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

			<div className="space-y-4">
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
							<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
							<h3 className="mb-2 text-lg font-medium">No notarizations found</h3>
							<p className="text-muted-foreground mb-4">
								{searchTerm ||
								statusFilter !== "ALL" ||
								workflowFilter !== "ALL" ||
								dateFilter !== "ALL"
									? "Try adjusting your search criteria or filters."
									: "You don't have any completed or cancelled notarizations yet."}
							</p>
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
											<CardContent>
												<div className="flex items-start justify-between gap-4">
													{/* LEFT SIDE */}
													<div className="flex-1 space-y-3">
														{/* Title + Badges */}
														<div className="flex flex-wrap items-center gap-2">
															<h3 className="text-base leading-tight font-semibold">
																{item.title}
															</h3>
															{statusBadge(item.status)}
															{workflowBadge(item.workflow)}
														</div>

														{/* Meta Info Row */}
														<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
															<div className="flex items-center gap-1">
																<User className="h-3.5 w-3.5" />
																<span>{isENP ? item.principal.name : item.enp.name}</span>
															</div>

															<div className="flex items-center gap-1">
																<FileText className="h-3.5 w-3.5" />
																<span>
																	{item.documents} doc{item.documents !== 1 && "s"}
																</span>
															</div>

															<div className="flex items-center gap-1">
																<Calendar className="h-3.5 w-3.5" />
																<span>
																	{item.status === "COMPLETED"
																		? format(new Date(item.completedAt!), "MMM dd, yyyy")
																		: format(new Date(item.cancelledAt!), "MMM dd, yyyy")}
																</span>
															</div>

															{item.duration > 0 && (
																<div className="flex items-center gap-1">
																	<Clock className="h-3.5 w-3.5" />
																	<span>{item.duration} min</span>
																</div>
															)}
														</div>

														{/* Status + Location Row */}
														<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
															<div className="flex items-center gap-1">
																{item.status === "COMPLETED" ? (
																	<>
																		<CheckCircle className="h-3.5 w-3.5 text-green-600" />
																		<span className="text-green-600">Completed</span>
																	</>
																) : (
																	<>
																		<XCircle className="h-3.5 w-3.5 text-red-600" />
																		<span className="text-red-600">
																			Cancelled
																			{item.cancellationReason
																				? `: ${item.cancellationReason}`
																				: ""}
																		</span>
																	</>
																)}
															</div>

															<div className="text-muted-foreground flex items-center gap-1">
																<MapPin className="h-3.5 w-3.5" />
																<span>{item.location}</span>
															</div>
														</div>

														{/* Participants Row (Compact) */}
														<div className="flex items-center gap-4 pt-1">
															<div className="flex items-center gap-2">
																<Avatar className="h-7 w-7">
																	<AvatarImage src={item.enp.avatar} />
																	<AvatarFallback>{getInitials(item.enp.name)}</AvatarFallback>
																</Avatar>
																<span className="text-xs font-medium">{item.enp.name}</span>
															</div>

															<div className="flex items-center gap-2">
																<Avatar className="h-7 w-7">
																	<AvatarFallback>
																		{getInitials(item.principal.name)}
																	</AvatarFallback>
																</Avatar>
																<span className="text-xs font-medium">{item.principal.name}</span>
															</div>
														</div>
													</div>

													{/* RIGHT SIDE ACTIONS */}
													<div className="flex shrink-0 flex-col gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleViewNotarization(item.id)}
															className="h-8 gap-1 px-3 text-xs"
														>
															<Eye className="h-3.5 w-3.5" />
															Details
														</Button>

														{item.certificateUrl && (
															<Button
																size="sm"
																variant="outline"
																onClick={() => window.open(item.certificateUrl, "_blank")}
																className="h-8 gap-1 px-3 text-xs"
															>
																<Download className="h-3.5 w-3.5" />
																Cert
															</Button>
														)}

														{item.recordingUrl && (
															<Button
																size="sm"
																variant="outline"
																onClick={() => window.open(item.recordingUrl, "_blank")}
																className="h-8 gap-1 px-3 text-xs"
															>
																<Video className="h-3.5 w-3.5" />
																Rec
															</Button>
														)}
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
			</div>
		</div>
	)
}
