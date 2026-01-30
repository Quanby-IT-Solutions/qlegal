"use client"

import { useMemo } from "react"
import { format, startOfDay } from "date-fns"

import { WeekCellsHeight } from "../../../lib/schedule-constants"
import type { CalendarEvent } from "../../../lib/schedule-types"
import { EventItem } from "../event-item"

interface DayViewProps {
	currentDate: Date
	events: CalendarEvent[]
	onEventSelect: (event: CalendarEvent) => void
	onEventCreate: (startTime: Date) => void
}

export function DayView({ currentDate, events, onEventSelect, onEventCreate }: DayViewProps) {
	const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

	const getEventsForHour = (hour: number): CalendarEvent[] => {
		const hourStart = startOfDay(currentDate)
		hourStart.setHours(hour, 0, 0, 0)
		const hourEnd = new Date(currentDate)
		hourEnd.setHours(hour + 1, 0, 0, 0)

		return events.filter(evt => {
			const evtStart = new Date(evt.start)
			const evtEnd = new Date(evt.end)

			return (
				(evtStart >= hourStart && evtStart < hourEnd) ||
				(evtEnd > hourStart && evtEnd <= hourEnd) ||
				(evtStart < hourStart && evtEnd > hourEnd)
			)
		})
	}

	const handleEventClick = (event: CalendarEvent) => (e: React.MouseEvent) => {
		e.stopPropagation()
		onEventSelect(event)
	}

	return (
		<div data-slot="day-view" className="flex h-full flex-col">
			<div className="grid grid-cols-1 border-b">
				<div className="bg-background dark:bg-input/30 border-r p-2 text-center">
					<div className="text-muted-foreground text-sm">
						{format(currentDate, "EEEE, MMMM d, yyyy")}
					</div>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto">
				{hours.map(hour => {
					const hourStart = new Date(currentDate)
					hourStart.setHours(hour, 0, 0, 0)
					const hourEvents = getEventsForHour(hour)

					return (
						<div
							key={hour}
							className="grid grid-cols-[60px_1fr] border-b"
							style={{ height: `${WeekCellsHeight}px` }}
						>
							<div className="text-muted-foreground bg-background dark:bg-input/30 border-r p-2 text-xs">
								{format(hourStart, "ha")}
							</div>
							<div
								className="hover:bg-muted/50 dark:hover:bg-muted/10 bg-background p-0 text-left transition cursor-pointer"
								onClick={() => onEventCreate(hourStart)}
							>
								<div className="flex flex-col gap-(--event-gap) p-1">
									{hourEvents.map(event => (
										<EventItem
											key={event.id}
											event={event}
											view="day"
											onClick={handleEventClick.bind(null, event)}
											showTime
										/>
									))}
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}