import { useMemo } from "react"
import { type inferRouterOutputs } from "@trpc/server"
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

import { type AppRouter } from "@/services/trpc/root"

import type { ScheduleIncomingItem } from "@/features/appointments/lib/use-appointments-schedule-actions"

type IncomingRequest = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"][number]
type IncomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getIncomingAppointmentsForENP"][number]

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
		<ItemGroup className="animate-in fade-in duration-300 motion-reduce:animate-none">
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
	)
}
