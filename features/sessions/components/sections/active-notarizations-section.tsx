"use client"

import { useMemo, useState } from "react"
import { type inferRouterOutputs } from "@trpc/server"
import { format, isAfter, isSameDay, startOfDay } from "date-fns"
import { Calendar, Clock, FileText, Users, Video } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Progress } from "@/core/components/ui/progress"
import { getAvatarUrl, getFullName, getInitials } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"
import { type AppRouter } from "@/services/trpc/root"

import { NotarizationDetailsDialog } from "@/features/sessions/components/dialogs/notarization-details-dialog"
import { getAppointmentStatusBadge } from "@/features/sessions/lib/meeting-badges"

type UpcomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getUpcomingAppointments"][number]

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
	return (
		<Card>
			<CardContent className="py-12 text-center">
				<Video className="text-muted-foreground mx-auto mb-4 size-12" />
				<h3 className="mb-2 text-lg font-medium">No meetings found</h3>
				<p className="text-muted-foreground mb-4">
					{hasFilters
						? "Try adjusting your search criteria."
						: "You don't have any upcoming meetings yet."}
				</p>
			</CardContent>
		</Card>
	)
}

interface MeetingCardProps {
	meeting: {
		id: string
		title: string
		createdAt: string | Date
		appointmentDate?: string | Date
		status?: string
		participants: { id?: string; userId?: string }[]
		documentStats: { total: number; signed: number; isComplete?: boolean }
		createdBy: {
			firstName?: string | null
			middleName?: string | null
			lastName?: string | null
			image?: string | null
		}
		isAppointment?: boolean
	}
	onViewDetails: (meetingId: string) => void
}

function MeetingCard({ meeting, onViewDetails }: MeetingCardProps) {
	const scheduledAt = meeting.appointmentDate ?? meeting.createdAt
	const scheduledLabel = scheduledAt ? format(new Date(scheduledAt), "PPp") : "Not scheduled"

	const { total: totalDocuments, signed: signedDocuments } = meeting.documentStats
	const documentProgress =
		totalDocuments > 0 ? Math.round((signedDocuments / totalDocuments) * 100) : 0
	const isComplete = meeting.documentStats.isComplete !== false

	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardContent className="relative">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						{/* Title + Status */}
						<div className="flex flex-wrap items-center gap-2">
							<h4 className="truncate text-base leading-tight font-semibold">{meeting.title}</h4>
							{meeting.isAppointment ? (
								<Badge variant="secondary">Pending Session</Badge>
							) : meeting.status ? (
								getAppointmentStatusBadge(meeting.status)
							) : null}
						</div>

						{/* Meta Row */}
						<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
							<div className="flex items-center gap-1">
								<Users className="size-3.5 shrink-0" />
								<span>
									{meeting.participants.length} participant
									{meeting.participants.length !== 1 ? "s" : ""}
								</span>
							</div>

							<div className="flex items-center gap-1">
								<FileText className="size-3.5 shrink-0" />
								<span>
									{totalDocuments} doc{totalDocuments !== 1 && "s"}
									{totalDocuments > 0 && (
										<span className="text-muted-foreground ml-1">
											&bull; {signedDocuments} signed ({documentProgress}%)
										</span>
									)}
								</span>
								{!isComplete && (
									<span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-[11px]">
										<span className="inline-flex size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										checking&hellip;
									</span>
								)}
							</div>

							<div className="flex items-center gap-1">
								<Calendar className="size-3.5 shrink-0" />
								<span>{scheduledLabel}</span>
							</div>

							<div className="flex items-center gap-1">
								<Clock className="size-3.5 shrink-0" />
								<span>{getFullName(meeting.createdBy) || "Unknown"}</span>
							</div>
						</div>

						{/* Host Row */}
						<div className="flex items-center gap-2 pt-1">
							<Avatar className="size-7">
								<AvatarImage src={getAvatarUrl(meeting.createdBy?.image) ?? undefined} />
								<AvatarFallback>
									{getInitials(getFullName(meeting.createdBy) || "Unknown")
										.split(" ")
										.map((n: string) => n[0])
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="text-xs font-medium">
								{getFullName(meeting.createdBy) || "Unknown"}
							</span>
							<span className="text-muted-foreground text-xs">&bull; Host</span>
						</div>

						{/* Signing Progress */}
						{totalDocuments > 0 && (
							<div className="pt-2">
								<div className="text-muted-foreground mb-1 flex items-center justify-between text-[11px]">
									<span>Signing Progress</span>
									<span className="text-foreground font-medium">
										{signedDocuments}/{totalDocuments}
									</span>
								</div>
								<Progress value={documentProgress} className="h-1.5" />
							</div>
						)}
					</div>

					<div className="shrink-0">
						<Button
							size="sm"
							variant="outline"
							onClick={() => onViewDetails(meeting.id)}
							className="h-8 px-3 text-xs"
						>
							View
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function ActiveNotarizationsSection() {
	const [searchTerm, setSearchTerm] = useState("")
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [detailsMeetingId, setDetailsMeetingId] = useState<string | null>(null)

	const today = startOfDay(new Date())

	const [pendingAppointments = []] = trpc.appointments.getUpcomingAppointments.useSuspenseQuery(
		undefined,
		{
			refetchInterval: 10_000,
		}
	)

	const appointmentCards = useMemo(() => {
		return pendingAppointments
			.filter((appt: UpcomingAppointment) => {
				// Only show in Upcoming if there is no session yet (pending ENP acceptance).
				// Once ENP accepts, meetingId is set and the session appears under Ongoing only.
				if (appt.meetingId) return false
				return true
			})
			.map((appt: UpcomingAppointment) => ({
				id: `appt-${appt.id}`,
				title:
					appt.type === "NOTARIZATION" ? "Pending Notarization Session" : "Pending Consultation",
				createdAt: appt.appointmentDate.toISOString(),
				status: "PENDING",
				participants: [],
				documentStats: { total: 0, signed: 0, isComplete: true },
				createdBy: appt.createdBy ?? {
					firstName: null,
					middleName: null,
					lastName: null,
					image: null,
				},
				isAppointment: true as const,
			}))
	}, [pendingAppointments])

	// Upcoming shows only pending appointments (no ENP acceptance yet). Accepted sessions
	// always go to Ongoing regardless of appointment date.
	const combinedMeetings = useMemo(() => {
		return [...appointmentCards]
	}, [appointmentCards])

	const filteredMeetings = useMemo(() => {
		const q = searchTerm.trim().toLowerCase()

		return combinedMeetings.filter(meeting => {
			const dateForFilter =
				(meeting as { appointmentDate?: string | Date }).appointmentDate ?? meeting.createdAt
			const meetingDate = startOfDay(new Date(dateForFilter))
			const createdByName = getFullName(meeting.createdBy)

			if (!(isAfter(meetingDate, today) || isSameDay(meetingDate, today))) return false

			if (
				q &&
				!meeting.title.toLowerCase().includes(q) &&
				!createdByName.toLowerCase().includes(q)
			) {
				return false
			}

			return true
		})
	}, [combinedMeetings, searchTerm, today])

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
				<h2 className="text-2xl font-semibold tracking-tight">Upcoming</h2>
				<p className="text-muted-foreground text-sm">
					Upcoming meetings scheduled with participants for notarization sessions.
				</p>
			</div>

			<h3 className="pt-5 text-sm">
				{filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? "s" : ""} Found
			</h3>

			<Card>
				<CardContent>
					<Input
						placeholder="Search meetings..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						className="max-w-sm"
					/>
				</CardContent>
			</Card>

			{filteredMeetings.length === 0 ? (
				<EmptyState hasFilters={!!searchTerm} />
			) : (
				<div className="space-y-4">
					{filteredMeetings.map(meeting => (
						<MeetingCard key={meeting.id} meeting={meeting} onViewDetails={handleViewDetails} />
					))}
				</div>
			)}

			<NotarizationDetailsDialog
				isOpen={detailsOpen}
				onClose={handleDialogClose}
				meetingId={detailsMeetingId}
			/>
		</div>
	)
}
