"use client"

import { useMemo } from "react"
import { addDays, format, isSameWeek, startOfDay, startOfWeek } from "date-fns"

import { WeekCellsHeight } from "../../../lib/schedule-constants"
import type { CalendarEvent } from "../../../lib/schedule-types"
import { EventItem } from "../event-item"

interface WeekViewProps {
	currentDate: Date
	events: CalendarEvent[]
	onEventSelect: (event: CalendarEvent) => void
	onEventCreate: (startTime: Date) => void
}

export function WeekView({ currentDate, events, onEventSelect, onEventCreate }: WeekViewProps) {
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
	const days = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart]
	)

	const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

	const getEventsForHourAndDay = (hour: number, day: Date) => {
		return events.filter(event => {
			const eventStart = new Date(event.start)
			const eventEnd = new Date(event.end)
			const dayStart = startOfDay(day)
			const hourStart = new Date(dayStart)
			hourStart.setHours(hour, 0, 0, 0)
			const hourEnd = new Date(dayStart)
			hourEnd.setHours(hour + 1, 0, 0, 0)

			return (
				(eventStart >= hourStart && eventStart < hourEnd) ||
				(eventEnd > hourStart && eventEnd <= hourEnd) ||
				(eventStart < hourStart && eventEnd > hourEnd)
			)
		})
	}

	const handleEventClick = (event: CalendarEvent) => (e: React.MouseEvent) => {
		e.stopPropagation()
		onEventSelect(event)
	}

	return (
		<div data-slot="week-view" className="flex h-full flex-col">
			<div className="bg-background dark:bg-input/30 dark:border-input grid grid-cols-8 border-b">
				<div className="text-muted-foreground border-r p-2 text-sm">Time</div>
				{days.map(day => (
					<div
						key={day.toISOString()}
						className={`text-muted-foreground border-r p-2 text-center text-sm ${!isSameWeek(day, currentDate) ? "text-muted-foreground/70" : ""}`}
					>
						<div className="font-medium">{format(day, "EEE")}</div>
						<div className="text-xs">{format(day, "d")}</div>
					</div>
				))}
			</div>
			<div className="flex-1 overflow-y-auto">
				{hours.map(hour => (
					<div
						key={hour}
						className="grid grid-cols-8 border-b"
						style={{ height: `${WeekCellsHeight}px` }}
					>
						<div className="text-muted-foreground bg-background border-r p-2 text-xs">
							{format(new Date().setHours(hour, 0, 0, 0), "ha")}
						</div>
						{days.map(day => {
							const dayEvents = getEventsForHourAndDay(hour, day)
							const hourStart = new Date(day)
							hourStart.setHours(hour, 0, 0, 0)

							return (
								<div
									key={`${day.toISOString()}-${hour}`}
									className="hover:bg-muted/50 dark:hover:bg-muted/10 bg-background cursor-pointer border-r p-0 text-left transition"
									onClick={() => onEventCreate(hourStart)}
								>
									<div className="flex flex-col gap-(--event-gap) p-1">
										{dayEvents.map(event => (
											<EventItem
												key={event.id}
												event={event}
												view="week"
												onClick={handleEventClick(event)}
												showTime
											/>
										))}
									</div>
								</div>
							)
						})}
					</div>
				))}
			</div>
		</div>
	)
}
