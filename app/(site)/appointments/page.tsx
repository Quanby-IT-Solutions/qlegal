"use client"

import { useMemo, useState } from "react"
import { format, startOfToday } from "date-fns"
import { Calendar as CalendarIcon, Clock, Handshake, Loader2, MapPin, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { EventCalendar, type CalendarEvent } from "@/core/components/ui/event-calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { getInitials } from "@/core/lib/utils"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { useMeetings } from "@/features/meetings/api/meetings.hooks"

type Appointment = RouterOutputs["appointments"]["getMyAppointments"][number]

function normalizeDate(date: Date): Date {
	const normalized = new Date(date)
	normalized.setHours(12, 0, 0, 0)
	return normalized
}

function getWorkflow(appointment: Appointment): "REN" | "IEN" {
	if (appointment.meetingLink) return "REN"
	if (appointment.location) return "IEN"
	const notes = (appointment.notes || "").toLowerCase()
	const hasRemote = notes.includes("ren") || notes.includes("remote")
	return hasRemote ? "REN" : "IEN"
}

export default function EnpCalendarPage() {
	const { data: session } = useSession()
	const today = useMemo(() => startOfToday(), [])
	const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()))

	const {
		data: appointments,
		isLoading,
		isFetching,
		refetch,
	} = trpc.appointments.getMyAppointments.useQuery({
		limit: 100,
		offset: 0,
	})

	const enpAppointments = useMemo(() => {
		if (!appointments) return []
		if (session?.user?.role === "ENP") {
			return appointments.filter(apt => apt.lawyerId === session.user.id)
		}
		return appointments
	}, [appointments, session?.user?.id, session?.user?.role])

	const appointmentsByDate = useMemo(() => {
		const map = new Map<string, Appointment[]>()
		enpAppointments.forEach(apt => {
			const dateKey = format(new Date(apt.appointmentDate), "yyyy-MM-dd")
			const current = map.get(dateKey) ?? []
			current.push(apt)
			map.set(dateKey, current)
		})
		return map
	}, [enpAppointments])

	const bookedDates = useMemo(
		() => Array.from(appointmentsByDate.keys()).map(d => new Date(d)),
		[appointmentsByDate]
	)

	const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
	const appointmentsForDay = useMemo(() => {
		const list = appointmentsByDate.get(selectedDateKey) ?? []
		return list.sort(
			(a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
		)
	}, [appointmentsByDate, selectedDateKey])

	const hasData = (appointmentsForDay?.length ?? 0) > 0
	const isBusy = isLoading || isFetching

	// Transform appointments into calendar events
	const calendarEvents = useMemo((): CalendarEvent[] => {
		if (!enpAppointments) return []

		return enpAppointments.map((apt) => {
			const workflow = getWorkflow(apt)
			const startDate = new Date(apt.appointmentDate)
			const endDate = new Date(startDate.getTime() + (apt.duration || 30) * 60 * 1000)

			return {
				id: apt.id,
				title: `${apt.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"} with ${apt.client?.name || "Client"}`,
				start: startDate,
				end: endDate,
				metadata: {
					type: "appointment",
					appointmentType: apt.type,
					status: apt.status,
					workflow,
					color: apt.status === "CONFIRMED" ? "#3b82f6" : apt.status === "PENDING" ? "#f59e0b" : "#6b7280",
				},
			}
		})
	}, [enpAppointments])

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "My Calendar" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">My Calendar</h1>
						<p className="text-muted-foreground">
							View and manage your booked consultations and notarization sessions.
						</p>
					</div>

					<div className="grid gap-6 lg:grid-cols-[420px,1fr]">
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Select a date</CardTitle>
									<CardDescription>Days with bookings are highlighted.</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<EventCalendar
										events={calendarEvents}
										onDateClick={(date) => setSelectedDate(normalizeDate(date))}
										defaultView="month"
										defaultDate={selectedDate}
										height={400}
										className="bg-muted/30 rounded-2xl border p-4 shadow-sm"
									/>

									<Separator />

									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<p className="text-sm font-medium">Selected day</p>
											<p className="text-muted-foreground text-sm">
												{selectedDate ? format(selectedDate, "EEEE, MMM d") : "No date selected"}
											</p>
										</div>
										<Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isBusy}>
											{isBusy ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Updating
												</>
											) : (
												"Refresh"
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-4">
							<Card className="border-dashed">
								<CardHeader className="flex flex-row items-center justify-between space-y-0">
									<div>
										<CardTitle className="text-lg">
											Appointments for {format(selectedDate, "PPP")}
										</CardTitle>
										<CardDescription>
											{isBusy
												? "Loading your schedule..."
												: hasData
													? "Jump into sessions or review details."
													: "No appointments on this day."}
										</CardDescription>
									</div>
									<Badge variant={hasData ? "default" : "outline"}>
										{appointmentsForDay.length} booked
									</Badge>
								</CardHeader>
							</Card>

							{isBusy && (
								<div className="grid grid-cols-1 gap-3">
									{Array.from({ length: 3 }).map((_, idx) => (
										<Card key={idx} className="animate-pulse">
											<CardHeader className="space-y-2">
												<div className="bg-muted h-4 w-24 rounded" />
												<div className="bg-muted h-3 w-36 rounded" />
											</CardHeader>
											<CardContent className="space-y-2">
												<div className="bg-muted h-3 w-28 rounded" />
												<div className="bg-muted h-10 rounded" />
											</CardContent>
										</Card>
									))}
								</div>
							)}

							{!isBusy && !hasData && (
								<Card>
									<CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
										<CalendarIcon className="text-muted-foreground h-10 w-10" />
										<div>
											<p className="font-medium">No appointments this day</p>
											<p className="text-muted-foreground text-sm">
												Choose another date to see upcoming sessions.
											</p>
										</div>
									</CardContent>
								</Card>
							)}

							{!isBusy && hasData && (
								<div className="grid grid-cols-1 gap-3">
									{appointmentsForDay.map(apt => (
										<AppointmentCard
											key={apt.id}
											appointment={apt}
											currentUser={session?.user}
											onRefetch={() => void refetch()}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}

function AppointmentCard({
	appointment,
	currentUser,
	onRefetch,
}: {
	appointment: Appointment
	currentUser?: { id?: string; role?: string }
	onRefetch: () => void
}) {
	const router = useRouter()
	const workflow = getWorkflow(appointment)
	const { create, startMeeting } = useMeetings()
	const utils = trpc.useUtils()
	const [isStarting, setIsStarting] = useState(false)
	const updateAppointment = trpc.appointments.updateAppointment.useMutation({
		onSuccess: () => {
			onRefetch()
		},
	})
	const confirmConsultation = trpc.consultations.confirmConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation accepted")
			onRefetch()
		},
		onError: err => toast.error(err.message || "Failed to accept"),
	})
	const cancelConsultation = trpc.consultations.cancelConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation rejected")
			onRefetch()
		},
		onError: err => toast.error(err.message || "Failed to reject"),
	})
	const confirmAppointment = trpc.appointments.confirmAppointment.useMutation({
		onSuccess: () => {
			toast.success("Signing session accepted")
			onRefetch()
		},
		onError: err => toast.error(err.message || "Failed to accept"),
	})
	const cancelAppointment = trpc.appointments.cancelAppointment.useMutation({
		onSuccess: () => {
			toast.success("Signing session rejected")
			onRefetch()
		},
		onError: err => toast.error(err.message || "Failed to reject"),
	})
	const meetingIdFromLink = useMemo(() => {
		const match = appointment.meetingLink?.match(/\/meetings\/([^/]+)/)
		return match?.[1] ?? null
	}, [appointment.meetingLink])
	const { data: linkedMeeting, isLoading: isLoadingMeeting, refetch: refetchLinkedMeeting } = trpc.meetings.getById.useQuery(
		meetingIdFromLink ?? "",
		{
			enabled: !!meetingIdFromLink,
		}
	)
	const isMeetingLive = linkedMeeting?.status === "ONGOING"
	const isMeetingScheduled = linkedMeeting?.status === "SCHEDULED"
	const isLawyer = currentUser?.role === "ENP" && currentUser.id === appointment.lawyerId
	const isPastSlot = new Date(appointment.appointmentDate).getTime() < Date.now()
	// Can start meeting if:
	// 1. REN workflow
	// 2. User is the lawyer (ENP)
	// 3. Appointment is confirmed
	// 4. Either no meeting link exists, OR meeting exists but status is SCHEDULED, OR meeting data is still loading
	// 5. Not past the appointment time
	const canStartMeeting =
		workflow === "REN" &&
		isLawyer &&
		appointment.status === "CONFIRMED" &&
		(!appointment.meetingLink || (isLoadingMeeting && !linkedMeeting) || (linkedMeeting && isMeetingScheduled)) &&
		!isPastSlot
	// Can join meeting if meeting exists and is ONGOING (and not loading)
	const canJoinMeeting =
		workflow === "REN" &&
		isLawyer &&
		appointment.status === "CONFIRMED" &&
		!isLoadingMeeting &&
		isMeetingLive
	const isPendingConsultation =
		appointment.type === "CONSULTATION" && appointment.status === "PENDING" && isLawyer
	const isPendingSigning =
		appointment.type === "DOCUMENT_SIGNING" && appointment.status === "PENDING" && isLawyer
	const startTimeLabel = format(new Date(appointment.appointmentDate), "h:mm a")
	const dateLabel = format(new Date(appointment.appointmentDate), "PPP")

	const handleStartMeeting = async () => {
		if (!isLawyer) return
		if (isPastSlot) {
			toast.error("This appointment time has already lapsed.")
			return
		}
		setIsStarting(true)
		try {
			// If meeting already exists (from accept), use it. Otherwise create new one.
			let meetingId = meetingIdFromLink
			
			if (!meetingId) {
				// Create new meeting if it doesn't exist
				const title = `${appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"} with ${appointment.client?.name || "Client"}`
				const result = await create.mutateAsync({
					title,
					participantIds: [appointment.clientId],
				})
				meetingId = result.meeting.id
				
				// Update appointment with meeting link
				await updateAppointment.mutateAsync({
					appointmentId: appointment.id,
					meetingLink: `/meetings/${meetingId}/lobby`,
				})
			}
			
			// Start the meeting
			await startMeeting.mutateAsync(meetingId)
			
			// Invalidate and refetch meeting queries immediately
			await utils.meetings.getById.invalidate(meetingId)
			void utils.meetings.getUserMeetings.invalidate()
			
			// Refetch the linked meeting query if it exists
			if (meetingId === meetingIdFromLink) {
				await refetchLinkedMeeting()
			}
			
			// Refetch appointments to update UI
			await utils.appointments.getMyAppointments.invalidate()
			onRefetch()
			
			toast.success("Meeting started")
		} catch (error) {
			console.error(error)
			toast.error("Couldn't start the meeting")
		} finally {
			setIsStarting(false)
		}
	}

	const handleJoinMeeting = () => {
		if (meetingIdFromLink) {
			router.push(`/meetings/${meetingIdFromLink}/lobby`)
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between space-y-0">
				<div className="space-y-1">
					<CardTitle className="text-lg">
						{appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"}
					</CardTitle>
					<CardDescription>
						{dateLabel} at {startTimeLabel}
					</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className={
							workflow === "REN"
								? "border-blue-600 text-blue-600"
								: "border-green-600 text-green-600"
						}
					>
						{workflow === "REN" ? "Remote" : "In-Person"}
					</Badge>
					<Badge variant={appointment.status === "CONFIRMED" ? "default" : "secondary"}>
						{appointment.status}
					</Badge>
					{meetingIdFromLink && (
						<Badge
							variant={isMeetingLive ? "default" : "secondary"}
							className={isMeetingLive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
						>
							{isMeetingLive ? "In a meeting" : "Available"}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center gap-3">
					<Avatar className="h-10 w-10">
						<AvatarImage
							src={appointment.client?.image || undefined}
							alt={appointment.client?.name || "Client"}
						/>
						<AvatarFallback>{getInitials(appointment.client?.name || "Client")}</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="leading-tight font-medium">{appointment.client?.name || "Client"}</p>
						<p className="text-muted-foreground truncate text-sm">{appointment.client?.email}</p>
					</div>
				</div>

				<div className="text-muted-foreground grid gap-2 text-sm">
					<div className="flex items-center gap-2">
						<Clock className="h-4 w-4" />
						<span>Duration: {appointment.duration || 30} mins</span>
					</div>
					<div className="flex items-center gap-2">
						{workflow === "REN" ? <Video className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
						<span>
							{workflow === "REN"
								? appointment.meetingLink
									? "Video meeting link provided"
									: "Remote session (link pending)"
								: appointment.location
									? appointment.location
									: "In-person location TBD"}
						</span>
					</div>
				</div>

				{(isPendingConsultation || isPendingSigning) && (
					<div className="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant="default"
							onClick={() => {
								if (isPendingConsultation) {
									void confirmConsultation.mutate({
										consultationId: appointment.id,
									})
								} else if (isPendingSigning) {
									void confirmAppointment.mutate({
										appointmentId: appointment.id,
										meetingLink: appointment.meetingLink || "",
									})
								}
							}}
							disabled={
								confirmConsultation.isPending ||
								cancelConsultation.isPending ||
								confirmAppointment.isPending ||
								cancelAppointment.isPending
							}
						>
							{confirmConsultation.isPending || confirmAppointment.isPending
								? "Accepting..."
								: "Accept"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								if (isPendingConsultation) {
									void cancelConsultation.mutate({
										consultationId: appointment.id,
										cancelReason: "Rejected by ENP",
									})
								} else if (isPendingSigning) {
									void cancelAppointment.mutate({
										appointmentId: appointment.id,
										cancelReason: "Rejected by ENP",
									})
								}
							}}
							disabled={
								confirmConsultation.isPending ||
								cancelConsultation.isPending ||
								confirmAppointment.isPending ||
								cancelAppointment.isPending
							}
						>
							{cancelConsultation.isPending || cancelAppointment.isPending
								? "Rejecting..."
								: "Reject"}
						</Button>
					</div>
				)}

				{canStartMeeting && (
					<Button
						size="sm"
						variant="default"
						onClick={() => void handleStartMeeting()}
						disabled={
							isStarting ||
							create.isPending ||
							startMeeting.isPending ||
							updateAppointment.isPending
						}
					>
						<Video className="mr-2 h-4 w-4" />
						{isStarting || create.isPending || startMeeting.isPending
							? "Starting..."
							: "Start Meeting"}
					</Button>
				)}

				{canJoinMeeting && (
					<div className="flex flex-wrap items-center gap-2">
						<Button size="sm" variant="default" onClick={handleJoinMeeting}>
							<Video className="mr-2 h-4 w-4" />
							Join Meeting
						</Button>
						<Button asChild size="sm" variant="outline">
							<a href={`/appointments/${appointment.id}/meeting`}>
								<Video className="mr-2 h-4 w-4" />
								Open Meeting Page
							</a>
						</Button>
					</div>
				)}

				{!canStartMeeting && !canJoinMeeting && isPastSlot && !appointment.meetingLink && (
					<Badge variant="outline" className="border-amber-600 text-amber-600">
						Scheduled time has lapsed
					</Badge>
				)}
			</CardContent>
		</Card>
	)
}
