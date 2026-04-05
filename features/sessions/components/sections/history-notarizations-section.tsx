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
import { getAvatarUrl, getInitials } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { NotarizationDetailsDialog } from "@/features/sessions/components/dialogs/notarization-details-dialog"

type WorkflowType = "REN" | "IEN"

interface HistoryItem {
	id: string
	title: string
	status: "COMPLETED" | "CANCELLED"
	workflow: WorkflowType
	source: "meeting" | "appointment"
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
	return (
		<Card>
			<CardContent className="py-12 text-center">
				<FileText className="text-muted-foreground mx-auto mb-4 size-12" />
				<h3 className="mb-2 text-lg font-medium">No notarizations found</h3>
				<p className="text-muted-foreground mb-4">
					{hasFilters
						? "Try adjusting your search criteria or filters."
						: "You don't have any completed or cancelled notarizations yet."}
				</p>
			</CardContent>
		</Card>
	)
}

function WorkflowBadge({ workflow }: { workflow: WorkflowType }) {
	return (
		<Badge
			variant="outline"
			className={workflow === "REN" ? "border-info text-info" : "border-success text-success"}
		>
			{workflow}
		</Badge>
	)
}

function StatusBadge({ status }: { status: HistoryItem["status"] }) {
	if (status === "COMPLETED") {
		return (
			<Badge variant="outline" className="border-success text-success">
				Completed
			</Badge>
		)
	}
	return <Badge variant="destructive">Cancelled</Badge>
}

interface HistoryCardProps {
	item: HistoryItem
	isENP: boolean
	onViewDetails: (meetingId: string) => void
}

function HistoryCard({ item, isENP, onViewDetails }: HistoryCardProps) {
	const dateLabel =
		item.status === "COMPLETED"
			? format(new Date(item.completedAt!), "MMM dd, yyyy")
			: format(new Date(item.cancelledAt!), "MMM dd, yyyy")

	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardContent>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 space-y-3">
						{/* Title + Badges */}
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="text-base leading-tight font-semibold">{item.title}</h3>
							<StatusBadge status={item.status} />
							<WorkflowBadge workflow={item.workflow} />
						</div>

						{/* Meta Info */}
						<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
							<div className="flex items-center gap-1">
								<User className="size-3.5" />
								<span>{isENP ? item.principal.name : item.enp.name}</span>
							</div>

							<div className="flex items-center gap-1">
								<FileText className="size-3.5" />
								<span>
									{item.documents} doc{item.documents !== 1 && "s"}
								</span>
							</div>

							<div className="flex items-center gap-1">
								<Calendar className="size-3.5" />
								<span>{dateLabel}</span>
							</div>

							{item.duration > 0 && (
								<div className="flex items-center gap-1">
									<Clock className="size-3.5" />
									<span>{item.duration} min</span>
								</div>
							)}
						</div>

						{/* Status + Location */}
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
							<div className="flex items-center gap-1">
								{item.status === "COMPLETED" ? (
									<>
										<CheckCircle className="text-success size-3.5" />
										<span className="text-success">Completed</span>
									</>
								) : (
									<>
										<XCircle className="text-destructive size-3.5" />
										<span className="text-destructive">
											Cancelled
											{item.cancellationReason ? `: ${item.cancellationReason}` : ""}
										</span>
									</>
								)}
							</div>

							<div className="text-muted-foreground flex items-center gap-1">
								<MapPin className="size-3.5" />
								<span>{item.location}</span>
							</div>
						</div>

						{/* Participants */}
						<div className="flex items-center gap-4 pt-1">
							<div className="flex items-center gap-2">
								<Avatar className="size-7">
									<AvatarImage src={getAvatarUrl(item.enp.avatar) ?? undefined} />
									<AvatarFallback>{getInitials(item.enp.name)}</AvatarFallback>
								</Avatar>
								<span className="text-xs font-medium">{item.enp.name}</span>
							</div>

							<div className="flex items-center gap-2">
								<Avatar className="size-7">
									<AvatarFallback>{getInitials(item.principal.name)}</AvatarFallback>
								</Avatar>
								<span className="text-xs font-medium">{item.principal.name}</span>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex shrink-0 flex-col gap-2">
						{item.source === "meeting" && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => onViewDetails(item.id)}
								className="h-8 gap-1 px-3 text-xs"
							>
								<Eye className="size-3.5" />
								Details
							</Button>
						)}

						{item.certificateUrl && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => window.open(item.certificateUrl, "_blank")}
								className="h-8 gap-1 px-3 text-xs"
							>
								<Download className="size-3.5" />
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
								<Video className="size-3.5" />
								Rec
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
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
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [detailsMeetingId, setDetailsMeetingId] = useState<string | null>(null)

	const [meetingsData] = trpc.meetings.getUserMeetingsWithDocumentStats.useSuspenseQuery({
		limit: 50,
		offset: 0,
	})

	const meetings = useMemo(() => meetingsData.items, [meetingsData.items])

	const [appointments] = trpc.appointments.getMyAppointments.useSuspenseQuery({
		limit: 50,
		offset: 0,
	})

	const isENP = session?.user?.role === "ENP"

	const historyItems = useMemo<HistoryItem[]>(() => {
		const items: HistoryItem[] = []

		for (const m of meetings.filter(
			m => m.documentStats.total > 0 && m.documentStats.signed >= m.documentStats.total
		)) {
			items.push({
				id: m.id,
				title: "Notarization Session",
				status: "COMPLETED",
				workflow: "REN",
				source: "meeting",
				enp: {
					name: m.createdBy?.name ?? "Unknown ENP",
					avatar: m.createdBy?.image ?? undefined,
				},
				principal: {
					name: "Client",
				},
				completedAt: new Date(m.updatedAt ?? m.createdAt).toISOString(),
				duration: 30,
				documents: m.documentStats?.total ?? 0,
				location: "Remote Video Call",
			})
		}

		if (appointments) {
			for (const a of appointments.filter(a => a.status === "CANCELLED")) {
				const workflow: WorkflowType = a.meetingId ? "REN" : "IEN"
				const principalParticipant = a.participants?.find(p => p.participantRole === "PARTICIPANT")

				items.push({
					id: a.id,
					title:
						a.title ??
						`${a.type === "NOTARIZATION" ? "Notarization" : "Consultation"} - ${
							principalParticipant?.user?.name ?? "Client"
						}`,
					status: "CANCELLED",
					workflow,
					source: "appointment",
					enp: {
						name: a.createdBy?.name ?? "Unknown ENP",
						avatar: a.createdBy?.image ?? undefined,
					},
					principal: {
						name: principalParticipant?.user?.name ?? "Unknown Client",
						email: principalParticipant?.user?.email ?? undefined,
					},
					cancelledAt: new Date(a.updatedAt).toISOString(),
					duration: a.duration ?? 30,
					documents: 0,
					location: a.location ?? (workflow === "REN" ? "Remote Video Call" : "In-Person Meeting"),
					cancellationReason: a.cancelReason ?? undefined,
				})
			}
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
			const date = new Date(item.completedAt ?? item.cancelledAt!)
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
			const date = new Date(item.completedAt ?? item.cancelledAt ?? new Date().toISOString())
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

	const hasFilters =
		!!searchTerm || statusFilter !== "ALL" || workflowFilter !== "ALL" || dateFilter !== "ALL"

	const handleViewDetails = (meetingId: string) => {
		setDetailsMeetingId(meetingId)
		setDetailsOpen(true)
	}

	const handleDialogClose = (open: boolean) => {
		setDetailsOpen(open)
		if (!open) setDetailsMeetingId(null)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Past</h2>
				<p className="text-muted-foreground text-sm">
					History of your completed and cancelled notarization sessions
				</p>
			</div>

			<h3 className="pt-5 text-sm">
				{filteredHistory.length} Notarization{filteredHistory.length !== 1 ? "s" : ""} Found
			</h3>

			<Card>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
						<Input
							placeholder="Search notarizations..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
						<Select
							value={workflowFilter}
							onValueChange={value => setWorkflowFilter(value as "ALL" | WorkflowType)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All Workflows" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Workflows</SelectItem>
								<SelectItem value="REN">REN (Remote)</SelectItem>
								<SelectItem value="IEN">IEN (In-Person)</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={statusFilter}
							onValueChange={value => setStatusFilter(value as "ALL" | "COMPLETED" | "CANCELLED")}
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
						<Select
							value={dateFilter}
							onValueChange={value =>
								setDateFilter(value as "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR")
							}
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
					</div>
				</CardContent>
			</Card>

			<div className="space-y-4">
				{filteredHistory.length === 0 ? (
					<EmptyState hasFilters={hasFilters} />
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
										<HistoryCard
											key={item.id}
											item={item}
											isENP={isENP}
											onViewDetails={handleViewDetails}
										/>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<NotarizationDetailsDialog
				isOpen={detailsOpen}
				onClose={handleDialogClose}
				meetingId={detailsMeetingId}
			/>
		</div>
	)
}
