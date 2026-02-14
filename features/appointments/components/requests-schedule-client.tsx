"use client"

import { useRouter } from "next/navigation"
import { memo, useMemo, useState } from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import {
	CalendarScheduleBody,
	CalendarScheduleDatePagination,
	CalendarScheduleGoToToday,
	CalendarScheduleHeader,
	CalendarScheduleMonthPicker,
	CalendarScheduleProvider,
	CalendarScheduleYearPicker,
	useCalendarSchedule,
	useCalendarScheduleHeader,
	useSelectedDayEvents,
	type CalendarEvent,
	type Status,
} from "@/core/components/calendar-schedule"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/core/components/ui/item"
import { Separator } from "@/core/components/ui/separator"
import { getAvatarUrl, getInitials } from "@/core/lib/utils"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { trpc } from "@/services/trpc/client"

import type { IncomingItem } from "../api/requests.router"
import type { CalendarEvent as LegacyCalendarEvent } from "../lib/schedule-types"
import { addHoursToDate } from "../lib/schedule-utils"
import { EventDialog } from "./event-dialog"
import { RejectDialog } from "./reject-dialog"

const STATUS_PENDING: Status = { id: "pending", name: "Pending", color: "#F59E0B" }
const STATUS_CONFIRMED: Status = { id: "confirmed", name: "Confirmed", color: "#10B981" }
const STATUS_REJECTED: Status = { id: "rejected", name: "Rejected", color: "#EF4444" }
const STATUS_IN_PROGRESS: Status = {
	id: "in_progress",
	name: "In Progress",
	color: "#3B82F6",
}
const STATUS_CONSULTATION: Status = {
	id: "consultation",
	name: "Consultation",
	color: "#0EA5E9",
}
const STATUS_DOCUMENT_SIGNING: Status = {
	id: "document_signing",
	name: "Document Signing",
	color: "#10B981",
}

type CalendarEventWithPrincipal = CalendarEvent & {
	principal?: { name?: string | null; image?: string | null }
}

type AppointmentWithClient = Appointment & {
	client?: { name?: string | null; image?: string | null }
}

function toCalendarEvent(apt: AppointmentWithClient, status: Status): CalendarEventWithPrincipal {
	const eventDate = new Date(apt.appointmentDate)
	const endDate = new Date(eventDate.getTime() + (apt.duration ?? 60) * 60 * 1000)
	const notes = apt.notes?.split("\n")[0]
	return {
		id: apt.id,
		title: notes ?? (apt.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"),
		description: apt.notes ?? undefined,
		startAt: eventDate,
		endAt: endDate,
		status,
		principal: apt.client ? { name: apt.client.name, image: apt.client.image } : undefined,
	}
}

function toCalendarEventFromIncomingItem(item: IncomingItem): CalendarEventWithPrincipal | null {
	if (item.source === "appointment" && item.appointmentData) {
		const apt = item.appointmentData
		const status: Status =
			apt.status === "PENDING"
				? STATUS_PENDING
				: apt.status === "CONFIRMED"
					? STATUS_CONFIRMED
					: apt.status === "CANCELLED"
						? STATUS_REJECTED
						: STATUS_CONFIRMED
		const ev = toCalendarEvent(
			{
				id: apt.id,
				appointmentDate: apt.appointmentDate,
				duration: apt.duration,
				notes: apt.notes,
				type: apt.type,
				status: apt.status,
			} as AppointmentWithClient,
			status
		)
		ev.principal = apt.client ? { name: apt.client.name, image: apt.client.image } : undefined
		return ev
	}
	if (item.source === "request") {
		const startAt = new Date(item.createdAt)
		const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
		const status: Status =
			item.status === "PENDING"
				? STATUS_PENDING
				: item.status === "REJECTED"
					? STATUS_REJECTED
					: item.status === "IN_PROGRESS"
						? STATUS_IN_PROGRESS
						: STATUS_CONFIRMED
		return {
			id: item.id,
			title: item.title ?? "Request",
			description: item.description ?? undefined,
			startAt,
			endAt,
			status,
			principal: item.principal
				? { name: item.principal.name, image: item.principal.image }
				: undefined,
		}
	}
	return null
}

interface RequestsScheduleClientProps {
	scheduleData: {
		regular: EnpAvailability[]
		blocked: EnpAvailability[]
		recurringBlocked: EnpAvailability[]
		custom: EnpAvailability[]
		myAppointments?: Appointment[]
	}
	incomingRequests: IncomingItem[]
}

const EventCard = memo(function EventCard({
	event,
	relativeLabel,
	onClick,
}: {
	event: CalendarEventWithPrincipal
	relativeLabel: string | null
	onClick?: () => void
}) {
	return (
		<Item
			variant="outline"
			size="sm"
			className="hover:bg-muted/50 hover:cursor-pointer"
			onClick={onClick}
		>
			<ItemMedia>
				<Avatar className="size-8">
					<AvatarImage src={getAvatarUrl(event.principal?.image) ?? undefined} alt="" />
					<AvatarFallback className="text-xs">
						{getInitials(event.principal?.name ?? "?")}
					</AvatarFallback>
				</Avatar>
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{event.title}</ItemTitle>
				{relativeLabel ? (
					<ItemDescription className="text-muted-foreground line-clamp-1 text-xs">
						{relativeLabel}
					</ItemDescription>
				) : null}
			</ItemContent>
			<ItemActions>
				<Button variant="ghost" size="icon">
					<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
				</Button>
			</ItemActions>
		</Item>
	)
})

function CalendarCardHeader() {
	const { monthYear, eventCount } = useCalendarScheduleHeader()
	return (
		<>
			<CardTitle>{monthYear}</CardTitle>
			<CardDescription>
				{eventCount} {eventCount === 1 ? "event" : "events"} this month
			</CardDescription>
		</>
	)
}

function EventListHeader() {
	const { formattedDate, relativeDay } = useCalendarScheduleHeader()
	return (
		<>
			<CardTitle>{formattedDate ?? "Select a date"}</CardTitle>
			<CardDescription>{relativeDay ?? "Select a date to view"}</CardDescription>
		</>
	)
}

function AddEventSection({
	onSave,
}: {
	onSave: (event: LegacyCalendarEvent, onComplete?: () => void) => void
}) {
	const { selectedDate } = useCalendarSchedule()
	const [isOpen, setIsOpen] = useState(false)

	const defaultEvent: LegacyCalendarEvent = useMemo(() => {
		const d = selectedDate ? new Date(selectedDate) : new Date()
		d.setHours(9, 0, 0, 0)
		return {
			id: "",
			title: "",
			start: d,
			end: addHoursToDate(d, 1),
			allDay: false,
		}
	}, [selectedDate])

	return (
		<>
			<Button variant="outline" onClick={() => setIsOpen(true)}>
				Add Event
			</Button>
			<EventDialog
				event={defaultEvent}
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				onSave={ev => onSave(ev, () => setIsOpen(false))}
			/>
		</>
	)
}

function SidebarEventList() {
	const dayEvents = useSelectedDayEvents()

	if (dayEvents.length === 0) {
		return <p className="text-muted-foreground py-4 text-center text-sm">No events scheduled</p>
	}

	return (
		<ItemGroup>
			{dayEvents.map(item => (
				<EventCard key={item.event.id} event={item.event} relativeLabel={item.relativeLabel} />
			))}
		</ItemGroup>
	)
}

export function RequestsScheduleClient({
	scheduleData,
	incomingRequests,
}: RequestsScheduleClientProps) {
	const router = useRouter()
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation()
	const confirmAppointmentMutation = trpc.appointments.confirmAppointment.useMutation()
	const cancelAppointmentMutation = trpc.appointments.cancelAppointment.useMutation()
	const createEnpEvent = trpc.schedule.createEnpEvent.useMutation({
		onSuccess: () => {
			void utils.requests.getEnpSchedule.invalidate()
			void utils.requests.getIncomingRequests.invalidate()
			void utils.requests.getIncomingAppointmentsForENP.invalidate()
			router.refresh()
			toast.success("Event created successfully")
		},
		onError: error => {
			toast.error("Failed to create event", { description: error.message })
		},
	})

	const revalidate = async () => {
		await utils.requests.getIncomingRequests.invalidate()
		await utils.requests.getIncomingAppointmentsForENP.invalidate()
		await utils.requests.getEnpSchedule.invalidate()
		router.refresh()
	}

	const handleAccept = async (item: IncomingItem) => {
		setProcessingId(item.id)
		try {
			if (item.source === "appointment") {
				await confirmAppointmentMutation.mutateAsync({
					appointmentId: item.id,
					meetingLink: item.appointmentData?.meetingLink ?? "",
				})
			} else {
				await updateStatusMutation.mutateAsync({
					requestId: item.id,
					status: "IN_PROGRESS",
				})
			}
			toast.success("Request accepted successfully!")
			await revalidate()
			router.push("/sessions")
		} catch (error) {
			toast.error("Failed to accept request", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingId(null)
		}
	}

	const handleRejectClick = (item: IncomingItem) => {
		setSelectedRequestId(item.id)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)

		const item = incomingRequests.find(r => r.id === selectedRequestId)
		if (!item) return

		try {
			if (item.source === "appointment") {
				await cancelAppointmentMutation.mutateAsync({
					appointmentId: item.id,
					cancelReason: "Rejected by ENP",
				})
			} else {
				await updateStatusMutation.mutateAsync({
					requestId: selectedRequestId,
					status: "REJECTED",
				})
			}
			toast.success("Request rejected!")
			setRejectDialogOpen(false)
			await revalidate()
		} catch (error) {
			toast.error("Failed to reject request", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingId(null)
		}
	}

	const calendarEvents = useMemo((): CalendarEventWithPrincipal[] => {
		const seen = new Set<string>()
		const result: CalendarEventWithPrincipal[] = []

		const add = (e: CalendarEventWithPrincipal) => {
			if (seen.has(e.id)) return
			seen.add(e.id)
			result.push(e)
		}

		const myAppointments = scheduleData?.myAppointments ?? []
		for (const apt of myAppointments) {
			const status: Status =
				apt.status === "PENDING"
					? STATUS_PENDING
					: apt.type === "CONSULTATION"
						? STATUS_CONSULTATION
						: STATUS_DOCUMENT_SIGNING
			add(toCalendarEvent(apt, status))
		}

		for (const item of incomingRequests) {
			const ev = toCalendarEventFromIncomingItem(item)
			if (ev) add(ev)
		}

		return result
	}, [scheduleData, incomingRequests])

	const pendingRequests = useMemo(
		() => incomingRequests.filter(r => r.status === "PENDING"),
		[incomingRequests]
	)

	const handleEventSave = (event: LegacyCalendarEvent, onComplete?: () => void) => {
		const duration = Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))
		const startTime = `${event.start.getHours().toString().padStart(2, "0")}:${event.start.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${event.end.getHours().toString().padStart(2, "0")}:${event.end.getMinutes().toString().padStart(2, "0")}`

		const appointmentType = event.eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION"
		const workflow =
			event.mode?.toLowerCase() === "ren" || (!event.location && event.eventType === "consultation")
				? "REN"
				: "IEN"

		createEnpEvent.mutate(
			{
				title: event.title.trim(),
				description: event.description?.trim(),
				appointmentDate: event.start,
				startTime,
				endTime,
				duration,
				allDay: event.allDay ?? false,
				location: event.location?.trim(),
				type: appointmentType,
				workflow,
				notes: event.description?.trim(),
			},
			{
				onSuccess: () => {
					onComplete?.()
				},
			}
		)
	}

	return (
		<>
			<CalendarScheduleProvider
				events={calendarEvents}
				className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0"
			>
				<Card className="col-span-2 mb-4 lg:mb-0">
					<CardHeader>
						<CalendarCardHeader />
					</CardHeader>
					<Separator />
					<CardContent>
						<div className="mb-3 flex items-center justify-between">
							<div className="flex flex-wrap items-center gap-1">
								<CalendarScheduleMonthPicker />
								<CalendarScheduleYearPicker />
								<CalendarScheduleGoToToday />
							</div>
							<CalendarScheduleDatePagination />
						</div>

						<CalendarScheduleHeader />

						<CalendarScheduleBody>
							{({ event }) => {
								return (
									<div key={event.id} className="flex min-w-0 items-center gap-2">
										<Badge variant="outline" className="truncate">
											{event.title}
										</Badge>
									</div>
								)
							}}
						</CalendarScheduleBody>
					</CardContent>
				</Card>

				<Card className="order-first col-span-1 lg:order-0 lg:col-span-1 lg:flex lg:max-h-[calc(100vh-12rem)] lg:flex-col">
					<CardHeader className="shrink-0">
						<EventListHeader />
						<CardAction>
							<AddEventSection onSave={handleEventSave} />
						</CardAction>
					</CardHeader>
					<Separator />
					<CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
						{pendingRequests.length > 0 && (
							<div className="space-y-2">
								<h3 className="text-sm font-medium">Pending ({pendingRequests.length})</h3>
								<div className="flex flex-col gap-2">
									{pendingRequests.map(request => (
										<Item
											key={request.id}
											variant="outline"
											size="sm"
											className="hover:bg-muted/50"
										>
											<ItemMedia>
												<Avatar className="size-8">
													<AvatarImage
														src={getAvatarUrl(request.principal?.image) ?? undefined}
														alt=""
													/>
													<AvatarFallback className="text-xs">
														{getInitials(request.principal?.name ?? "?")}
													</AvatarFallback>
												</Avatar>
											</ItemMedia>
											<ItemContent className="min-w-0">
												<ItemTitle className="truncate">
													{request.principal?.name ?? "Unknown"}
												</ItemTitle>
												<ItemDescription className="line-clamp-1 text-xs">
													{request.title}
												</ItemDescription>
											</ItemContent>
											<ItemActions>
												<Button
													variant="outline"
													size="sm"
													className="text-destructive hover:bg-destructive/10"
													onClick={() => handleRejectClick(request)}
													disabled={processingId === request.id}
												>
													Reject
												</Button>
												<Button
													size="sm"
													onClick={() => handleAccept(request)}
													disabled={processingId === request.id}
												>
													{processingId === request.id ? "..." : "Accept"}
												</Button>
											</ItemActions>
										</Item>
									))}
								</div>
							</div>
						)}

						<div className="space-y-2">
							<h3 className="text-sm font-medium">Selected day</h3>
							<SidebarEventList />
						</div>
					</CardContent>
				</Card>
			</CalendarScheduleProvider>

			<RejectDialog
				isOpen={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onConfirm={handleReject}
				isProcessing={processingId !== null}
			/>
		</>
	)
}
