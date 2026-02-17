"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { isBefore, startOfDay } from "date-fns"
import { toast } from "sonner"

import {
	CalendarScheduleEventCard,
	CalendarScheduleProvider,
	useCalendarSchedule,
	useCalendarScheduleHeader,
	useSelectedDayEvents,
	type CalendarEvent,
	type Status,
} from "@/core/components/calendar-schedule"
import { Button } from "@/core/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { ItemGroup } from "@/core/components/ui/item"
import { Separator } from "@/core/components/ui/separator"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { trpc } from "@/services/trpc/client"

import type { AppointmentItem } from "../api/appointments.router"
import { addHoursToDate } from "../lib/schedule-utils"
import { CalendarCard } from "./calendar/calendar-card"
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
const STATUS_LAPSED: Status = { id: "lapsed", name: "Lapsed", color: "#D97706" }

function toCalendarEvent(
	apt: Appointment & { client?: { name?: string | null; image?: string | null } },
	status: Status
): CalendarEvent {
	const eventDate = new Date(apt.appointmentDate)
	const notes = apt.notes?.split("\n")[0]
	return {
		id: apt.id,
		title: notes ?? (apt.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
		description: apt.notes ?? undefined,
		startAt: eventDate,
		status,
		principal: apt.client ? { name: apt.client.name, image: apt.client.image } : undefined,
		appointmentType: apt.type as "NOTARIZATION" | "CONSULTATION" | undefined,
	}
}

function toCalendarEventFromIncomingItem(item: AppointmentItem): CalendarEvent | null {
	if (item.source === "appointment" && item.appointmentData) {
		const apt = item.appointmentData
		const status: Status = apt.lapsed
			? STATUS_LAPSED
			: apt.status === "PENDING"
				? STATUS_PENDING
				: apt.status === "CONFIRMED"
					? STATUS_CONFIRMED
					: apt.status === "CANCELLED"
						? STATUS_REJECTED
						: STATUS_CONFIRMED
		const eventDate = new Date(apt.appointmentDate)
		return {
			id: apt.id,
			title:
				apt.notes?.split("\n")[0] ??
				(apt.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
			description: apt.notes ?? undefined,
			startAt: eventDate,
			status,
			principal: apt.client ? { name: apt.client.name, image: apt.client.image } : undefined,
			appointmentType: apt.type,
			workflow: item.workflow as "REN" | "IEN" | undefined,
			meta: { source: item.source, incomingItemId: item.id },
		}
	}
	if (item.source === "request") {
		const startAt = new Date(item.createdAt)
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
			status,
			principal: item.principal
				? { name: item.principal.name, image: item.principal.image }
				: undefined,
			workflow: item.workflow as "REN" | "IEN" | undefined,
			meta: { source: item.source, incomingItemId: item.id },
		}
	}
	return null
}

interface AppointmentsScheduleClientProps {
	scheduleData: {
		regular: EnpAvailability[]
		blocked: EnpAvailability[]
		recurringBlocked: EnpAvailability[]
		custom: EnpAvailability[]
		myAppointments?: (Appointment & { lapsed?: boolean })[]
	}
	incomingRequests: AppointmentItem[]
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
	onSave: (event: CalendarEvent, onComplete?: () => void) => void
}) {
	const { selectedDate } = useCalendarSchedule()
	const [isOpen, setIsOpen] = useState(false)

	const defaultEvent: CalendarEvent | null = useMemo(() => {
		const d = selectedDate ? new Date(selectedDate) : new Date()
		d.setHours(9, 0, 0, 0)
		return {
			id: "",
			title: "",
			startAt: d,
			status: STATUS_PENDING,
		}
	}, [selectedDate])

	const isDateInPast = selectedDate
		? isBefore(startOfDay(new Date(selectedDate)), startOfDay(new Date()))
		: false

	return (
		<>
			{!isDateInPast && (
				<Button variant="outline" onClick={() => setIsOpen(true)}>
					Add Event
				</Button>
			)}
			<EventDialog
				event={defaultEvent}
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				onSave={ev => onSave(ev, () => setIsOpen(false))}
			/>
		</>
	)
}

function UnifiedSidebarList({
	incomingRequests,
	onAccept,
	onReject,
	processingId,
}: {
	incomingRequests: AppointmentItem[]
	onAccept: (item: AppointmentItem) => void
	onReject: (item: AppointmentItem) => void
	processingId: string | null
}) {
	const dayEvents = useSelectedDayEvents()

	// Build lookup maps from incomingRequests by both item.id and appointmentData.id
	const itemLookup = useMemo(() => {
		const map = new Map<string, AppointmentItem>()
		for (const item of incomingRequests) {
			map.set(item.id, item)
			if (item.source === "appointment" && item.appointmentData) {
				map.set(item.appointmentData.id, item)
			}
		}
		return map
	}, [incomingRequests])

	// Sort: pending items first, then by start time
	const sortedEvents = useMemo(
		() =>
			[...dayEvents].sort((a, b) => {
				const aPending = a.event.status.id === "pending" ? 0 : 1
				const bPending = b.event.status.id === "pending" ? 0 : 1
				if (aPending !== bPending) return aPending - bPending
				return new Date(a.event.startAt).getTime() - new Date(b.event.startAt).getTime()
			}),
		[dayEvents]
	)

	if (sortedEvents.length === 0) {
		return <p className="text-muted-foreground py-4 text-center text-sm">No events scheduled</p>
	}

	return (
		<ItemGroup>
			{sortedEvents.map(item => {
				const ev = item.event
				const incomingItemId = (ev.meta?.incomingItemId as string | undefined) ?? ev.id
				const incomingItem = itemLookup.get(ev.id) ?? itemLookup.get(incomingItemId)
				const isProcessing = processingId === ev.id || processingId === incomingItem?.id

				return (
					<CalendarScheduleEventCard
						key={ev.id}
						event={ev}
						formattedTime={item.formattedTime}
						relativeLabel={item.relativeLabel}
						onAccept={incomingItem ? () => onAccept(incomingItem) : undefined}
						onReject={incomingItem ? () => onReject(incomingItem) : undefined}
						isProcessing={isProcessing}
					/>
				)
			})}
		</ItemGroup>
	)
}

export function AppointmentsScheduleClient({
	scheduleData,
	incomingRequests,
}: AppointmentsScheduleClientProps) {
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

	const handleAccept = async (item: AppointmentItem) => {
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

	const handleRejectClick = (item: AppointmentItem) => {
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

	const calendarEvents = useMemo((): CalendarEvent[] => {
		const seen = new Set<string>()
		const result: CalendarEvent[] = []

		const add = (e: CalendarEvent) => {
			if (seen.has(e.id)) return
			seen.add(e.id)
			result.push(e)
		}

		// Process incoming requests first so pending items keep their originalItem reference
		for (const item of incomingRequests) {
			const ev = toCalendarEventFromIncomingItem(item)
			if (ev) add(ev)
		}

		const myAppointments = scheduleData?.myAppointments ?? []
		for (const apt of myAppointments) {
			const status: Status = apt.lapsed
				? STATUS_LAPSED
				: apt.status === "PENDING"
					? STATUS_PENDING
					: STATUS_CONFIRMED
			add(toCalendarEvent(apt, status))
		}

		return result
	}, [scheduleData, incomingRequests])

	const handleEventSave = (event: CalendarEvent, onComplete?: () => void) => {
		// Calculate duration (default 60 minutes if no endAt)
		const endAt = event.endAt ?? addHoursToDate(event.startAt, 1)
		const duration = Math.round((endAt.getTime() - event.startAt.getTime()) / (60 * 1000))
		const startTime = `${event.startAt.getHours().toString().padStart(2, "0")}:${event.startAt.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${endAt.getHours().toString().padStart(2, "0")}:${endAt.getMinutes().toString().padStart(2, "0")}`

		const appointmentType = event.appointmentType ?? "CONSULTATION"
		const workflow = event.workflow ?? (event.meta?.location ? "IEN" : "REN")

		createEnpEvent.mutate(
			{
				title: event.title.trim(),
				description: event.description?.trim(),
				appointmentDate: event.startAt,
				startTime,
				endTime,
				duration,
				allDay: event.allDay ?? false,
				location: (event.meta?.location as string | undefined)?.trim(),
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
				<CalendarCard events={calendarEvents} />

				<Card className="order-first col-span-1 lg:order-0 lg:col-span-1 lg:flex lg:max-h-[calc(100vh-12rem)] lg:flex-col">
					<CardHeader className="shrink-0">
						<EventListHeader />
						<CardAction>
							<AddEventSection onSave={handleEventSave} />
						</CardAction>
					</CardHeader>
					<Separator />
					<CardContent className="min-h-0 flex-1 overflow-y-auto">
						<UnifiedSidebarList
							incomingRequests={incomingRequests}
							onAccept={handleAccept}
							onReject={handleRejectClick}
							processingId={processingId}
						/>
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
