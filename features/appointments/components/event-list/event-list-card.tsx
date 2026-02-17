import { useMemo } from "react"
import { CalendarIcon, InboxIcon } from "lucide-react"

import {
	CalendarScheduleEventCard,
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
		if (incomingRequests.length === 0 && dayEvents.length === 0) {
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
		<ItemGroup className="animate-in fade-in duration-300 motion-reduce:animate-none">
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
