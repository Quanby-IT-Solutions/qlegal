"use client"

import { addDays, format, isSameDay, isToday } from "date-fns"

import { cn } from "@/core/lib/utils"

import { AgendaDaysToShow } from "../../../lib/schedule-constants"
import type { CalendarEvent } from "../../../lib/schedule-types"
import { EventItem } from "../event-item"

interface AgendaViewProps {
	currentDate: Date
	events: CalendarEvent[]
	onEventSelect: (event: CalendarEvent) => void
}

export function AgendaView({ currentDate, events, onEventSelect }: AgendaViewProps) {
	const agendaDays = Array.from({ length: AgendaDaysToShow }, (_, i) => addDays(currentDate, i))

	const getEventsForDay = (day: Date) => {
		return events.filter(event => {
			const eventStart = new Date(event.start)
			const eventEnd = new Date(event.end)
			return (
				isSameDay(day, eventStart) ||
				isSameDay(day, eventEnd) ||
				(day > eventStart && day < eventEnd)
			)
		})
	}

	const handleEventClick = (event: CalendarEvent) => (e: React.MouseEvent) => {
		e.stopPropagation()
		onEventSelect(event)
	}

	return (
		<div data-slot="agenda-view" className="flex h-full flex-col">
			{agendaDays.map(day => {
				const dayEvents = getEventsForDay(day)

				if (dayEvents.length === 0) {
					return null
				}

				return (
					<div key={day.toISOString()} className="border-b last:border-b-0">
						<div
							className={cn(
								"bg-background dark:bg-input/30 dark:border-input border-b px-4 py-2 text-sm font-medium",
								isToday(day) ? "text-primary" : "text-muted-foreground"
							)}
						>
							{format(day, "EEEE, MMMM d")}
							{isToday(day) && <span className="ml-2 text-xs">(Today)</span>}
						</div>
						<div className="bg-background space-y-2 p-4">
							{dayEvents.map(event => (
								<EventItem
									key={event.id}
									event={event}
									view="agenda"
									onClick={handleEventClick.bind(null, event)}
								/>
							))}
						</div>
					</div>
				)
			})}
			{agendaDays.every(day => getEventsForDay(day).length === 0) && (
				<div className="text-muted-foreground bg-background dark:bg-input/30 flex flex-1 items-center justify-center rounded p-4 text-sm">
					<p>No events scheduled for this period</p>
				</div>
			)}
		</div>
	)
}
