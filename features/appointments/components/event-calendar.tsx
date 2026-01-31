"use client"

import { useEffect, useMemo, useState } from "react"
import {
	DndContext,
	MouseSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core"
import {
	addDays,
	addMonths,
	addWeeks,
	endOfMonth,
	endOfWeek,
	format,
	getWeek,
	startOfMonth,
	startOfWeek,
	subMonths,
	subWeeks,
} from "date-fns"
import {
	CalendarIcon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

import { EventDetailsDialog } from "@/features/appointments/components/event-details-dialog"

import { AgendaDaysToShow, EventGap, EventHeight, WeekCellsHeight } from "../lib/schedule-constants"
import type { CalendarEvent, CalendarView } from "../lib/schedule-types"
import { addHoursToDate } from "../lib/schedule-utils"
import { EventDialog } from "./event-dialog"
import { AgendaView } from "./schedule/views/agenda-view"
import { DayView } from "./schedule/views/day-view"
import { MonthView } from "./schedule/views/month-view"
import { WeekView } from "./schedule/views/week-view"

export interface EventCalendarProps {
	events?: CalendarEvent[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (eventId: string) => void
	className?: string
	initialView?: CalendarView
}

export function EventCalendar({
	events = [],
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	className,
	initialView = "month",
}: EventCalendarProps) {
	const [currentDate, setCurrentDate] = useState<Date>(new Date())
	const [view, setView] = useState<CalendarView>(initialView)
	const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
	const [isEventDetailsDialogOpen, setIsEventDetailsDialogOpen] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const { data: session } = useSession()

	// Add keyboard shortcuts for view switching
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Skip if user is typing in an input, textarea or contentEditable element
			// or if any dialog is open
			if (
				isEventDialogOpen ||
				isEventDetailsDialogOpen ||
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target instanceof HTMLElement && e.target.isContentEditable)
			) {
				return
			}

			switch (e.key.toLowerCase()) {
				case "m":
					setView("month")
					break
				case "w":
					setView("week")
					break
				case "d":
					setView("day")
					break
				case "a":
					setView("agenda")
					break
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [isEventDialogOpen, isEventDetailsDialogOpen])

	const handlePrevious = () => {
		if (view === "month") {
			setCurrentDate(subMonths(currentDate, 1))
		} else if (view === "week") {
			setCurrentDate(subWeeks(currentDate, 1))
		} else if (view === "day") {
			setCurrentDate(addDays(currentDate, -1))
		} else if (view === "agenda") {
			// For agenda view, go back 30 days (a full month)
			setCurrentDate(addDays(currentDate, -AgendaDaysToShow))
		}
	}

	const handleNext = () => {
		if (view === "month") {
			setCurrentDate(addMonths(currentDate, 1))
		} else if (view === "week") {
			setCurrentDate(addWeeks(currentDate, 1))
		} else if (view === "day") {
			setCurrentDate(addDays(currentDate, 1))
		} else if (view === "agenda") {
			// For agenda view, go forward 30 days (a full month)
			setCurrentDate(addDays(currentDate, AgendaDaysToShow))
		}
	}

	const handleToday = () => {
		setCurrentDate(new Date())
	}

	const handleEventSelect = (event: CalendarEvent) => {
		setSelectedEvent(event)
		// Check if current user owns this event
		const isEventOwner = event.metadata?.ownerId === session?.user?.id
		if (isEventOwner) {
			setIsEventDialogOpen(true)
		} else {
			setIsEventDetailsDialogOpen(true)
		}
	}

	const handleEventCreate = (startTime: Date) => {
		// Snap to 15-minute intervals
		const minutes = startTime.getMinutes()
		const remainder = minutes % 15
		if (remainder !== 0) {
			if (remainder < 7.5) {
				// Round down to nearest 15 min
				startTime.setMinutes(minutes - remainder)
			} else {
				// Round up to nearest 15 min
				startTime.setMinutes(minutes + (15 - remainder))
			}
			startTime.setSeconds(0)
			startTime.setMilliseconds(0)
		}

		const newEvent: CalendarEvent = {
			id: "",
			title: "",
			start: startTime,
			end: addHoursToDate(startTime, 1),
			allDay: false,
		}
		setSelectedEvent(newEvent)
		setIsEventDialogOpen(true)
	}

	const handleEventSave = (event: CalendarEvent) => {
		if (event.id) {
			onEventUpdate?.(event)
			// Show toast notification when an event is updated
			toast(`Event "${event.title}" updated`, {
				description: format(new Date(event.start), "MMM d, yyyy"),
				position: "bottom-left",
			})
		} else {
			onEventAdd?.({ ...event, id: Math.random().toString(36).substring(2, 11) })
			// Show toast notification when an event is added
			toast(`Event "${event.title}" added`, {
				description: format(new Date(event.start), "MMM d, yyyy"),
				position: "bottom-left",
			})
		}
		setIsEventDialogOpen(false)
		setSelectedEvent(null)
	}

	const handleEventDelete = (eventId: string) => {
		const deletedEvent = events.find(e => e.id === eventId)
		onEventDelete?.(eventId)
		setIsEventDialogOpen(false)
		setSelectedEvent(null)
		// Show toast notification when an event is deleted
		if (deletedEvent) {
			toast(`Event "${deletedEvent.title}" deleted`, {
				description: format(new Date(deletedEvent.start), "MMM d, yyyy"),
				position: "bottom-left",
			})
		}
	}

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	]

	const currentYear = new Date().getFullYear()
	const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i) // Current year ± 10

	const handleMonthChange = (monthName: string) => {
		const newMonth = months.indexOf(monthName)
		if (newMonth !== -1) {
			const newDate = new Date(currentDate)
			newDate.setMonth(newMonth)
			setCurrentDate(newDate)
		}
	}

	const handleYearChange = (yearString: string) => {
		const newYear = parseInt(yearString, 10)
		if (!isNaN(newYear)) {
			const newDate = new Date(currentDate)
			newDate.setFullYear(newYear)
			setCurrentDate(newDate)
		}
	}

	// Calculate week numbers for the current month
	const weeksInMonth = useMemo(() => {
		const monthEnd = endOfMonth(currentDate)
		const calendarStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
		const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
		const totalDays =
			Math.ceil((calendarEnd.getTime() - calendarStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
		const days = Array.from({ length: totalDays }, (_, i) => addDays(calendarStart, i))

		const weeks = []
		for (let i = 0; i < days.length; i += 7) {
			const weekDays = days.slice(i, i + 7)
			const firstDayOfWeek = weekDays[0]
			if (firstDayOfWeek) {
				weeks.push({
					number: getWeek(firstDayOfWeek, { weekStartsOn: 0 }),
					start: firstDayOfWeek,
				})
			}
		}
		return weeks
	}, [currentDate])

	// Calculate days in the current month
	const daysInMonth = useMemo(() => {
		const monthEnd = endOfMonth(currentDate)
		return Array.from({ length: monthEnd.getDate() }, (_, i) => i + 1)
	}, [currentDate])

	const handleWeekChange = (weekNumber: string) => {
		const week = weeksInMonth.find(w => w.number === parseInt(weekNumber, 10))
		if (week?.start) {
			setCurrentDate(week.start)
		}
	}

	const handleDayChange = (day: string) => {
		const newDate = new Date(currentDate)
		newDate.setDate(parseInt(day, 10))
		setCurrentDate(newDate)
	}

	// Configure sensors for better drag detection
	const sensors = useSensors(
		useSensor(MouseSensor, {
			// Require mouse to move by 5px before activating
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(PointerSensor, {
			// Require pointer to move by 5px before activating
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(TouchSensor, {
			// Press delay of 250ms, with tolerance of 5px of movement
			activationConstraint: {
				delay: 250,
				tolerance: 5,
			},
		}),
	)

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active?.id === over?.id) return

		const draggedEvent = active.data.current?.event as CalendarEvent | undefined
		const targetDate = over.data.current?.date as Date | undefined

		if (draggedEvent && targetDate && onEventUpdate) {
			const eventStart = new Date(draggedEvent.start)
			
			// Check if the target date is different from the original date
			// Compare year, month, and day (ignore time)
			const originalDate = new Date(eventStart)
			const isSameDate =
				originalDate.getFullYear() === targetDate.getFullYear() &&
				originalDate.getMonth() === targetDate.getMonth() &&
				originalDate.getDate() === targetDate.getDate()

			// Only proceed if actually moving to a different date
			if (isSameDate) return

			const eventEnd = new Date(draggedEvent.end)
			const duration = eventEnd.getTime() - eventStart.getTime()

			// Preserve the event's original time, just change the date
			const newStart = new Date(targetDate)
			newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), eventStart.getSeconds(), eventStart.getMilliseconds())

			const newEnd = new Date(newStart.getTime() + duration)

			const updatedEvent = {
				...draggedEvent,
				start: newStart,
				end: newEnd,
			}

			onEventUpdate(updatedEvent)

			// Show toast notification when an event is moved
			toast(`Event "${draggedEvent.title}" moved`, {
				description: format(newStart, "MMM d, yyyy"),
				position: "bottom-left",
			})
		}
	}

	return (
		<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
			<div
				className="bg-card flex flex-col rounded-lg border has-data-[slot=month-view]:flex-1"
				style={
					{
						"--event-height": `${EventHeight}px`,
						"--event-gap": `${EventGap}px`,
						"--week-cells-height": `${WeekCellsHeight}px`,
					} as React.CSSProperties
				}
			>
				<div className={cn("flex items-center justify-between border-b p-2 sm:p-4", className)}>
					<div className="flex items-center gap-1 sm:gap-4">
						<div className="flex items-center sm:gap-2">
							<Button variant="ghost" size="icon" onClick={handlePrevious} aria-label="Previous">
								<ChevronLeftIcon size={16} aria-hidden="true" />
							</Button>
							<Button variant="ghost" size="icon" onClick={handleNext} aria-label="Next">
								<ChevronRightIcon size={16} aria-hidden="true" />
							</Button>
						</div>
						{/* Year selector - shown in all views */}
						<Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
							<SelectTrigger className="w-24 sm:w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{years.map(year => (
									<SelectItem key={year} value={year.toString()}>
										{year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{/* Month selector - shown in all views */}
						<Select value={months[currentDate.getMonth()]} onValueChange={handleMonthChange}>
							<SelectTrigger className="w-32 sm:w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{months.map(month => (
									<SelectItem key={month} value={month}>
										{month}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{/* Week selector - shown in week and day views */}
						{(view === "week" || view === "day") && (
							<Select
								value={getWeek(currentDate, { weekStartsOn: 0 }).toString()}
								onValueChange={handleWeekChange}
							>
								<SelectTrigger className="w-24 sm:w-32">
									<SelectValue placeholder="Week" />
								</SelectTrigger>
								<SelectContent>
									{weeksInMonth.map(week => (
										<SelectItem key={week.number} value={week.number.toString()}>
											Week {week.number}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{/* Day selector - shown in day view only */}
						{view === "day" && (
							<Select value={currentDate.getDate().toString()} onValueChange={handleDayChange}>
								<SelectTrigger className="w-20 sm:w-24">
									<SelectValue placeholder="Day" />
								</SelectTrigger>
								<SelectContent>
									{daysInMonth.map(day => (
										<SelectItem key={day} value={day.toString()}>
											{day}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{/* Today button */}
						<Button
							variant="outline"
							className="max-[479px]:aspect-square max-[479px]:p-0!"
							onClick={handleToday}
						>
							<CalendarIcon className="min-[480px]:hidden" size={16} aria-hidden="true" />
							<span className="max-[479px]:sr-only">Today</span>
						</Button>
					</div>
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="gap-1.5 max-[479px]:h-8">
									<span>
										<span className="min-[480px]:hidden" aria-hidden="true">
											{view.charAt(0).toUpperCase()}
										</span>
										<span className="max-[479px]:sr-only">
											{view.charAt(0).toUpperCase() + view.slice(1)}
										</span>
									</span>
									<ChevronDownIcon className="-me-1 opacity-60" size={16} aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-32">
								<DropdownMenuItem onClick={() => setView("month")}>
									Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setView("week")}>
									Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setView("day")}>
									Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setView("agenda")}>
									Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="inline-block">
										<Button
											variant="outline"
											size="sm"
											className="max-[479px]:aspect-square max-[479px]:p-0!"
											disabled
										>
											<span className="max-sm:sr-only">Block time</span>
										</Button>
									</div>
								</TooltipTrigger>
								<TooltipContent>Coming soon</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<Button
							className="max-[479px]:aspect-square max-[479px]:p-0!"
							size="sm"
							onClick={() => {
								setSelectedEvent(null) // Ensure we're creating a new event
								setIsEventDialogOpen(true)
							}}
						>
							<PlusIcon className="opacity-60 sm:-ms-1" size={16} aria-hidden="true" />
							<span className="max-sm:sr-only">New event</span>
						</Button>
					</div>
				</div>
				<div className="flex flex-1 flex-col p-2 sm:p-4">
					{view === "month" && (
						<MonthView
							currentDate={currentDate}
							events={events}
							onEventSelect={handleEventSelect}
							onEventCreate={handleEventCreate}
						/>
					)}
					{view === "week" && (
						<WeekView
							currentDate={currentDate}
							events={events}
							onEventSelect={handleEventSelect}
							onEventCreate={handleEventCreate}
						/>
					)}
					{view === "day" && (
						<DayView
							currentDate={currentDate}
							events={events}
							onEventSelect={handleEventSelect}
							onEventCreate={handleEventCreate}
						/>
					)}
					{view === "agenda" && (
						<AgendaView
							currentDate={currentDate}
							events={events}
							onEventSelect={handleEventSelect}
						/>
					)}
				</div>
				{/* Edit dialog for event owners */}
				<EventDialog
					event={selectedEvent}
					isOpen={isEventDialogOpen}
					onClose={() => {
						setIsEventDialogOpen(false)
						setSelectedEvent(null)
					}}
					onSave={handleEventSave}
					onDelete={handleEventDelete}
				/>
				{/* Read-only details dialog for non-owners */}
				<EventDetailsDialog
					event={selectedEvent}
					isOpen={isEventDetailsDialogOpen}
					onClose={() => {
						setIsEventDetailsDialogOpen(false)
						setSelectedEvent(null)
					}}
				/>
			</div>
		</DndContext>
	)
}
