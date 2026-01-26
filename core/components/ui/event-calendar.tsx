"use client"

import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar"

import "react-big-calendar/lib/css/react-big-calendar.css"

import { useCallback, useMemo, useState } from "react"
import { format, getDay, parse, startOfWeek } from "date-fns"
import enUS from "date-fns/locale/en-US"

import { cn } from "@/core/lib/utils"

// Configure localizer
const locales = { "en-US": enUS }

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
})

export type CalendarEvent = {
	id: string
	title: string
	start: Date
	end: Date
	allDay?: boolean
	resource?: any
	metadata?: {
		type: string
		color?: string
		status?: string
		[key: string]: any
	}
}

export type EventCalendarProps = {
	events: CalendarEvent[]
	onEventClick?: (event: CalendarEvent) => void
	onDateClick?: (date: Date) => void
	onViewChange?: (view: View) => void
	onDateRangeChange?: (range: { start: Date; end: Date }) => void
	defaultView?: View
	defaultDate?: Date
	className?: string
	height?: number | string
	view?: View
	date?: Date
}

export function EventCalendar({
	events,
	onEventClick,
	onDateClick,
	onViewChange,
	onDateRangeChange,
	defaultView = Views.MONTH,
	defaultDate = new Date(),
	className,
	height = 600,
	view: controlledView,
	date: controlledDate,
}: EventCalendarProps) {
	const [internalView, setInternalView] = useState<View>(defaultView)
	const [internalDate, setInternalDate] = useState<Date>(defaultDate)

	const view = controlledView ?? internalView
	const date = controlledDate ?? internalDate

	const handleNavigate = useCallback(
		(newDate: Date) => {
			if (controlledDate === undefined) {
				setInternalDate(newDate)
			}
			if (onDateRangeChange) {
				const range = {
					start: newDate,
					end: new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0),
				}
				onDateRangeChange(range)
			}
		},
		[controlledDate, onDateRangeChange]
	)

	const handleViewChange = useCallback(
		(newView: View) => {
			if (controlledView === undefined) {
				setInternalView(newView)
			}
			onViewChange?.(newView)
		},
		[controlledView, onViewChange]
	)

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			onEventClick?.(event)
		},
		[onEventClick]
	)

	const handleSelectSlot = useCallback(
		(slotInfo: { start: Date; end: Date }) => {
			if (onDateClick) {
				onDateClick(slotInfo.start)
			}
		},
		[onDateClick]
	)

	const eventStyleGetter = useCallback((event: CalendarEvent) => {
		const backgroundColor = event.metadata?.color ?? "#3b82f6"
		const opacity = event.metadata?.status === "blocked" ? "0.6" : "1"

		return {
			style: {
				backgroundColor,
				opacity,
				borderRadius: "4px",
				border: "none",
				color: "#ffffff",
				fontSize: "12px",
				padding: "2px 4px",
			},
		}
	}, [])

	const dayPropGetter = useCallback((date: Date) => {
		const isToday = new Date().toDateString() === date.toDateString()
		return {
			className: isToday ? "bg-primary/5" : "",
		}
	}, [])

	return (
		<div className={cn("w-full", className)}>
			<style>{`
				.rbc-calendar {
					background-color: transparent;
				}
				.rbc-toolbar {
					margin-bottom: 1rem;
					display: flex;
					align-items: center;
					justify-content: space-between;
				}
				.rbc-toolbar button {
					font-size: 0.875rem;
					padding: 0.5rem 1rem;
					border-radius: 0.375rem;
				}
				.rbc-off-range-bg {
					background-color: #f3f4f6;
				}
				.rbc-today {
					background-color: #f0f9ff;
				}
				.rbc-header {
					padding: 0.5rem;
					text-align: center;
					font-size: 0.875rem;
					font-weight: 500;
				}
				.rbc-event {
					cursor: pointer;
				}
				.rbc-event:hover {
					opacity: 0.9;
				}
				.rbc-month-view {
					border: none;
				}
				.rbc-month-row {
					display: flex;
					flex-direction: row;
				}
				.rbc-day-bg + .rbc-day-bg {
					border-left: 1px solid #e5e7eb;
				}
				.rbc-header + .rbc-header {
					border-left: 1px solid #e5e7eb;
				}
				.rbc-show-more {
					color: #3b82f6;
					font-weight: 500;
				}
			`}</style>
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				style={{ height: typeof height === "number" ? `${height}px` : height }}
				view={view}
				date={date}
				onNavigate={handleNavigate}
				onView={handleViewChange}
				onSelectEvent={handleEventClick}
				onSelectSlot={handleSelectSlot}
				selectable
				eventPropGetter={eventStyleGetter}
				dayPropGetter={dayPropGetter}
				views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
				popup
				showMultiDayTimes
			/>
		</div>
	)
}
