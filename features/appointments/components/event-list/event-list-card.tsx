import { useMemo } from "react"
import { type inferRouterOutputs } from "@trpc/server"
import { CalendarIcon, HistoryIcon, InboxIcon } from "lucide-react"

import {
	CalendarScheduleEventCard,
	useCalendarSchedule,
	useCalendarScheduleHeader,
	useSelectedDayEvents,
} from "@/core/components/calendar-schedule"
import { CardDescription, CardTitle } from "@/core/components/ui/card"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { ItemGroup } from "@/core/components/ui/item"

import { type AppRouter } from "@/services/trpc/root"

import {
	toCalendarEventFromIncomingAppointment,
	toCalendarEventFromIncomingRequest,
} from "@/features/appointments/lib/calendar-events"
import type { ScheduleIncomingItem } from "@/features/appointments/lib/use-appointments-schedule-actions"

type IncomingRequest =
	inferRouterOutputs<AppRouter>["appointments"]["getEnpScheduleDashboard"]["incomingRequests"][number]
type IncomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getEnpScheduleDashboard"]["incomingAppointments"][number]

export function EventListHeader() {
	const { formattedDate, relativeDay } = useCalendarScheduleHeader()
	return (
		<>
			<CardTitle>{formattedDate ?? "Select a date"}</CardTitle>
			<CardDescription>{relativeDay ?? "Select a date to view"}</CardDescription>
		</>
	)
}

interface UnifiedSidebarListProps {
	incomingRequests: IncomingRequest[]
	incomingAppointments: IncomingAppointment[]
	onAccept: (item: ScheduleIncomingItem) => void
	onReject: (item: ScheduleIncomingItem) => void
	processingKey: string | null
}

export function UnifiedSidebarList({
	incomingRequests,
	incomingAppointments,
	onAccept,
	onReject,
	processingKey,
}: UnifiedSidebarListProps) {
	const dayEvents = useSelectedDayEvents()
	const { selectedDate } = useCalendarSchedule()

	const itemLookup = useMemo(() => {
		const map = new Map<string, ScheduleIncomingItem>()
		for (const request of incomingRequests) {
			map.set(`request:${request.id}`, { source: "request", item: request })
		}
		for (const appointment of incomingAppointments) {
			map.set(`appointment:${appointment.id}`, {
				source: "appointment",
				item: appointment,
			})
		}
		return map
	}, [incomingRequests, incomingAppointments])

	const selectedDayEventIds = useMemo(() => {
		return new Set(dayEvents.map(e => e.event.id))
	}, [dayEvents])

	const pendingInboxEvents = useMemo(() => {
		if (!selectedDate) return []

		const y = selectedDate.getFullYear()
		const m = selectedDate.getMonth()
		const d = selectedDate.getDate()
		const dayStart = new Date(y, m, d)
		const dayEnd = new Date(y, m, d, 23, 59, 59, 999)

		const pendingRequests = incomingRequests.filter(r => r.status === "PENDING")
		const pendingAppointments = incomingAppointments.filter(a => a.status === "PENDING")

		return [
			...pendingRequests.map(toCalendarEventFromIncomingRequest),
			...pendingAppointments.map(toCalendarEventFromIncomingAppointment),
		]
			.toSorted((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
			.filter(e => {
				const start = new Date(e.startAt)
				return start >= dayStart && start <= dayEnd && !selectedDayEventIds.has(e.id)
			})
	}, [incomingAppointments, incomingRequests, selectedDayEventIds, selectedDate])

	const pastEvents = useMemo(() => {
		if (!selectedDate) return []

		const y = selectedDate.getFullYear()
		const m = selectedDate.getMonth()
		const d = selectedDate.getDate()
		const dayStart = new Date(y, m, d)
		const dayEnd = new Date(y, m, d, 23, 59, 59, 999)

		const resolvedRequests = incomingRequests.filter(
			r => r.status === "COMPLETED" || r.status === "REJECTED" || r.status === "IN_PROGRESS"
		)

		const resolvedAppointments = incomingAppointments.filter(
			a => a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "ONGOING"
		)

		return [
			...resolvedRequests.map(toCalendarEventFromIncomingRequest),
			...resolvedAppointments.map(toCalendarEventFromIncomingAppointment),
		]
			.toSorted((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
			.filter(e => {
				const start = new Date(e.startAt)
				return start >= dayStart && start <= dayEnd && !selectedDayEventIds.has(e.id)
			})
	}, [incomingRequests, incomingAppointments, selectedDayEventIds, selectedDate])

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

	if (sortedEvents.length === 0 && pendingInboxEvents.length === 0 && pastEvents.length === 0) {
		if (
			incomingRequests.length === 0 &&
			incomingAppointments.length === 0 &&
			dayEvents.length === 0
		) {
			return (
				<Empty className="animate-in fade-in duration-300 motion-reduce:animate-none">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<InboxIcon className="size-5" />
						</EmptyMedia>
						<EmptyTitle>All caught up!</EmptyTitle>
						<EmptyDescription>
							You have no pending appointment requests at the moment. New requests will appear here.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)
		}

		return (
			<Empty className="animate-in fade-in duration-300 motion-reduce:animate-none">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<CalendarIcon className="size-5" />
					</EmptyMedia>
					<EmptyTitle>No events scheduled</EmptyTitle>
					<EmptyDescription>
						There are no appointments or events scheduled for this date. Select another date or
						create a new event.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<div className="space-y-6">
			{pendingInboxEvents.length > 0 ? (
				<div className="space-y-3">
					<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
						Pending requests
					</h3>
					<ItemGroup className="animate-in fade-in gap-2 duration-300 motion-reduce:animate-none">
						{pendingInboxEvents.map(ev => {
							const incomingItemId = (ev.meta?.incomingItemId as string | undefined) ?? ev.id
							const source = ev.meta?.source as "request" | "appointment" | undefined
							const lookupKey = source ? `${source}:${incomingItemId}` : null
							const incomingItem = lookupKey ? itemLookup.get(lookupKey) : undefined
							const isProcessing = lookupKey !== null && processingKey === lookupKey

							return (
								<CalendarScheduleEventCard
									key={`inbox:${ev.id}`}
									event={ev}
									formattedTime=""
									relativeLabel={null}
									onAccept={incomingItem ? () => onAccept(incomingItem) : undefined}
									onReject={incomingItem ? () => onReject(incomingItem) : undefined}
									isProcessing={isProcessing}
								/>
							)
						})}
					</ItemGroup>
				</div>
			) : null}

			{sortedEvents.length > 0 ? (
				<div className="space-y-3">
					<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
						Schedule
					</h3>
					<ItemGroup className="animate-in fade-in gap-2 duration-300 motion-reduce:animate-none">
						{sortedEvents.map(item => {
							const ev = item.event
							const incomingItemId = (ev.meta?.incomingItemId as string | undefined) ?? ev.id
							const source = ev.meta?.source as "request" | "appointment" | undefined
							const lookupKey = source ? `${source}:${incomingItemId}` : null
							const incomingItem = lookupKey ? itemLookup.get(lookupKey) : undefined
							const isProcessing = lookupKey !== null && processingKey === lookupKey

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
				</div>
			) : null}

			{pastEvents.length > 0 ? (
				<div className="space-y-3">
					<h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
						<HistoryIcon className="size-3" />
						History
					</h3>
					<ItemGroup className="animate-in fade-in gap-2 duration-300 motion-reduce:animate-none">
						{pastEvents.map(ev => (
							<CalendarScheduleEventCard
								key={`past:${ev.id}`}
								event={ev}
								formattedTime=""
								relativeLabel={null}
							/>
						))}
					</ItemGroup>
				</div>
			) : null}
		</div>
	)
}
