import { useMemo } from "react"

import {
	CalendarScheduleEventCard,
	useCalendarScheduleHeader,
	useSelectedDayEvents,
} from "@/core/components/calendar-schedule"
import { CardDescription, CardTitle } from "@/core/components/ui/card"
import { ItemGroup } from "@/core/components/ui/item"

import type { AppointmentItem } from "@/features/appointments/api/appointments.router"

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
	incomingRequests: AppointmentItem[]
	onAccept: (item: AppointmentItem) => void
	onReject: (item: AppointmentItem) => void
	processingId: string | null
}

export function UnifiedSidebarList({
	incomingRequests,
	onAccept,
	onReject,
	processingId,
}: UnifiedSidebarListProps) {
	const dayEvents = useSelectedDayEvents()

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
