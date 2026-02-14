"use client"

import * as React from "react"
import {
	differenceInDays,
	formatDistanceStrict,
	formatDistanceToNow,
	getDay,
	getDaysInMonth,
	isSameDay,
} from "date-fns"
import { Check, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDown } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"

export type Status = {
	id: string
	name: string
	color: string
}

export type CalendarEvent = {
	id: string
	title: string
	description?: string
	startAt: Date
	endAt: Date
	status: Status
}

type CalendarScheduleState = {
	month: number
	year: number
	selectedDate: Date | null
}

type CalendarScheduleAction =
	| { type: "SET_MONTH"; month: number }
	| { type: "SET_YEAR"; year: number }
	| { type: "PREVIOUS_MONTH" }
	| { type: "NEXT_MONTH" }
	| { type: "SELECT_DATE"; date: Date | null }
	| { type: "GO_TO_TODAY" }

function calendarScheduleReducer(
	state: CalendarScheduleState,
	action: CalendarScheduleAction
): CalendarScheduleState {
	switch (action.type) {
		case "SET_MONTH":
			return { ...state, month: action.month }
		case "SET_YEAR":
			return { ...state, year: action.year }
		case "PREVIOUS_MONTH":
			return state.month === 0
				? { ...state, month: 11, year: state.year - 1 }
				: { ...state, month: state.month - 1 }
		case "NEXT_MONTH":
			return state.month === 11
				? { ...state, month: 0, year: state.year + 1 }
				: { ...state, month: state.month + 1 }
		case "SELECT_DATE":
			return { ...state, selectedDate: action.date }
		case "GO_TO_TODAY": {
			const now = new Date()
			return {
				month: now.getMonth(),
				year: now.getFullYear(),
				selectedDate: now,
			}
		}
	}
}

type CalendarScheduleContextValue = {
	month: number
	year: number
	selectedDate: Date | null
	events: CalendarEvent[]
	dispatch: React.Dispatch<CalendarScheduleAction>
	locale: Intl.LocalesArgument
	startDay: number
}

const CalendarScheduleContext = React.createContext<CalendarScheduleContextValue | null>(null)

function useCalendarSchedule() {
	const context = React.useContext(CalendarScheduleContext)
	if (!context) {
		throw new Error("useCalendarSchedule must be used within a CalendarScheduleProvider")
	}
	return context
}

function monthsForLocale(
	localeName: Intl.LocalesArgument,
	monthFormat: Intl.DateTimeFormatOptions["month"] = "long"
) {
	const formatter = new Intl.DateTimeFormat(localeName, { month: monthFormat })
	return [...new Array(12).keys()].map(m => formatter.format(new Date(Date.UTC(2021, m, 2))))
}

function daysForLocale(locale: Intl.LocalesArgument, startDay: number) {
	const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" })
	const baseDate = new Date(2024, 0, startDay)
	return Array.from({ length: 7 }, (_, i) => {
		const date = new Date(baseDate)
		date.setDate(baseDate.getDate() + i)
		return formatter.format(date)
	})
}

function Combobox({
	value,
	setValue,
	data,
	labels,
	className,
}: {
	value: string
	setValue: (value: string) => void
	data: { value: string; label: string }[]
	labels: { button: string; empty: string; search: string }
	className?: string
}) {
	const [open, setOpen] = React.useState(false)
	const displayLabel = value
		? (data.find(item => item.value === value)?.label ?? value)
		: labels.button

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn("w-40 justify-between capitalize", className)}
					variant="outline"
				>
					{displayLabel}
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-40 p-0">
				<Command
					filter={(value, search) => {
						const label = data.find(item => item.value === value)?.label
						return label?.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
					}}
				>
					<CommandInput placeholder={labels.search} />
					<CommandList>
						<CommandEmpty>{labels.empty}</CommandEmpty>
						<CommandGroup>
							{data.map(item => (
								<CommandItem
									className="capitalize"
									key={item.value}
									onSelect={currentValue => {
										setValue(currentValue === value ? "" : currentValue)
										setOpen(false)
									}}
									value={item.value}
								>
									<Check
										className={cn(
											"mr-2 size-4",
											value === item.value ? "opacity-100" : "opacity-0"
										)}
									/>
									{item.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

function CalendarScheduleProvider({
	events,
	locale = "en-US",
	startDay = 0,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	events: CalendarEvent[]
	locale?: Intl.LocalesArgument
	startDay?: number
}) {
	const [state, dispatch] = React.useReducer(calendarScheduleReducer, undefined, () => {
		const now = new Date()
		return {
			month: now.getMonth(),
			year: now.getFullYear(),
			selectedDate: now,
		}
	})

	const value = React.useMemo(
		() => ({ ...state, events, dispatch, locale, startDay }),
		[state, events, dispatch, locale, startDay]
	)

	return (
		<CalendarScheduleContext.Provider value={value}>
			<div
				data-slot="calendar-schedule"
				className={cn("relative flex flex-col", className)}
				{...props}
			>
				{children}
			</div>
		</CalendarScheduleContext.Provider>
	)
}

function CalendarScheduleMonthPicker({ className }: { className?: string }) {
	const { month, dispatch, locale } = useCalendarSchedule()

	const monthData = React.useMemo(
		() =>
			monthsForLocale(locale).map((name, i) => ({
				value: i.toString(),
				label: name,
			})),
		[locale]
	)

	return (
		<Combobox
			className={className}
			data={monthData}
			labels={{
				button: "Select month",
				empty: "No month found",
				search: "Search month",
			}}
			setValue={v => {
				if (v) dispatch({ type: "SET_MONTH", month: Number.parseInt(v, 10) })
			}}
			value={month.toString()}
		/>
	)
}

function CalendarScheduleYearPicker({ className }: { className?: string }) {
	const { year, events, dispatch } = useCalendarSchedule()

	const yearData = React.useMemo(() => {
		let earliest = year
		let latest = year
		for (const e of events) {
			const s = e.startAt.getFullYear()
			const l = e.endAt.getFullYear()
			if (s < earliest) earliest = s
			if (l > latest) latest = l
		}
		const start = Math.min(earliest, year)
		const end = Math.max(latest, year) + 1
		return Array.from({ length: end - start + 1 }, (_, i) => ({
			value: (start + i).toString(),
			label: (start + i).toString(),
		}))
	}, [events, year])

	return (
		<Combobox
			className={className}
			data={yearData}
			labels={{
				button: "Select year",
				empty: "No year found",
				search: "Search year",
			}}
			setValue={v => {
				if (v) dispatch({ type: "SET_YEAR", year: Number.parseInt(v, 10) })
			}}
			value={year.toString()}
		/>
	)
}

function CalendarScheduleGoToToday({ className, ...props }: React.ComponentProps<"button">) {
	const { dispatch } = useCalendarSchedule()
	return (
		<Button
			className={cn("capitalize", className)}
			onClick={() => dispatch({ type: "GO_TO_TODAY" })}
			variant="outline"
			{...props}
		>
			Today
		</Button>
	)
}

function CalendarScheduleDatePagination({ className, ...props }: React.ComponentProps<"div">) {
	const { dispatch } = useCalendarSchedule()
	return (
		<div
			data-slot="calendar-schedule-date-pagination"
			className={cn("flex items-center gap-2", className)}
			{...props}
		>
			<Button onClick={() => dispatch({ type: "PREVIOUS_MONTH" })} size="icon" variant="ghost">
				<ChevronLeftIcon size={16} />
			</Button>
			<Button onClick={() => dispatch({ type: "NEXT_MONTH" })} size="icon" variant="ghost">
				<ChevronRightIcon size={16} />
			</Button>
		</div>
	)
}

function CalendarScheduleHeader({ className, ...props }: React.ComponentProps<"div">) {
	const { locale, startDay } = useCalendarSchedule()
	const daysData = React.useMemo(() => daysForLocale(locale, startDay), [locale, startDay])

	return (
		<div
			data-slot="calendar-schedule-header"
			className={cn("grid grow grid-cols-7", className)}
			{...props}
		>
			{daysData.map(day => (
				<div className="text-muted-foreground p-3 text-center text-xs" key={day}>
					{day}
				</div>
			))}
		</div>
	)
}

type GridCell = { day: number; type: "prev" | "current" | "next" }

function CalendarScheduleBody({
	children,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	children: (props: { event: CalendarEvent }) => React.ReactNode
}) {
	const { month, year, startDay, selectedDate, events, dispatch } = useCalendarSchedule()

	const { daysInMonth, firstDay, prevMonthDays } = React.useMemo(() => {
		const d = new Date(year, month, 1)
		return {
			daysInMonth: getDaysInMonth(d),
			firstDay: (getDay(d) - startDay + 7) % 7,
			prevMonthDays: getDaysInMonth(
				new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1)
			),
		}
	}, [year, month, startDay])

	const eventsByDay = React.useMemo(() => {
		const map = new Map<number, CalendarEvent[]>()
		const monthStart = new Date(year, month, 1)
		const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59, 999)

		for (const event of events) {
			const start = new Date(event.startAt)
			const end = new Date(event.endAt)
			if (start > monthEnd || end < monthStart) continue

			const first = Math.max(
				1,
				start.getMonth() === month && start.getFullYear() === year ? start.getDate() : 1
			)
			const last = Math.min(
				daysInMonth,
				end.getMonth() === month && end.getFullYear() === year ? end.getDate() : daysInMonth
			)

			for (let d = first; d <= last; d++) {
				const list = map.get(d)
				if (list) list.push(event)
				else map.set(d, [event])
			}
		}

		for (const [, list] of map) {
			list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
		}
		return map
	}, [events, daysInMonth, year, month])

	const gridCells = React.useMemo(() => {
		const cells: GridCell[] = []
		for (let i = 0; i < firstDay; i++)
			cells.push({ day: prevMonthDays - firstDay + i + 1, type: "prev" })
		for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "current" })
		const rem = 7 - ((firstDay + daysInMonth) % 7)
		if (rem < 7) for (let i = 0; i < rem; i++) cells.push({ day: i + 1, type: "next" })
		return cells
	}, [firstDay, daysInMonth, prevMonthDays])

	return (
		<div
			data-slot="calendar-schedule-body"
			className={cn("grid grow grid-cols-7", className)}
			{...props}
		>
			{gridCells.map((cell, index) => {
				if (cell.type !== "current") {
					return (
						<div
							key={`${cell.type}-${index}`}
							className={cn(
								"bg-secondary text-muted-foreground relative aspect-square overflow-hidden border-t border-r p-1 text-xs",
								index % 7 === 6 ? "border-r-0" : undefined
							)}
						>
							{cell.day}
						</div>
					)
				}

				const date = new Date(year, month, cell.day)
				const eventsForDay = eventsByDay.get(cell.day) ?? []
				const isSelected = selectedDate !== null && isSameDay(date, selectedDate)
				const isToday = isSameDay(date, new Date())

				return (
					<div
						key={cell.day}
						role="button"
						tabIndex={0}
						onClick={() => dispatch({ type: "SELECT_DATE", date })}
						onKeyDown={e => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								dispatch({ type: "SELECT_DATE", date })
							}
						}}
						className={cn(
							"relative aspect-square overflow-hidden border-t border-r",
							index % 7 === 6 ? "border-r-0" : undefined,
							"hover:bg-accent/50 cursor-pointer transition-colors",
							isSelected ? "bg-accent ring-ring ring-2 ring-inset" : undefined
						)}
					>
						<div className="text-muted-foreground relative flex size-full flex-col gap-1 p-1 text-xs">
							{isToday ? (
								<Badge variant="secondary" className="border-input w-fit border font-normal">
									{cell.day}
								</Badge>
							) : (
								cell.day
							)}
							<div>{eventsForDay.slice(0, 3).map(event => children({ event }))}</div>
							{eventsForDay.length > 3 ? (
								<span className="text-muted-foreground block text-xs">
									+{eventsForDay.length - 3} more
								</span>
							) : null}
						</div>
					</div>
				)
			})}
		</div>
	)
}

function CalendarScheduleItem({
	event,
	className,
	...props
}: React.ComponentProps<"div"> & { event: CalendarEvent }) {
	return (
		<div
			data-slot="calendar-schedule-item"
			className={cn("flex items-center gap-2", className)}
			{...props}
		>
			<div
				className="size-2 shrink-0 rounded-full"
				style={{ backgroundColor: event.status.color }}
			/>
			<span className="truncate">{event.title}</span>
		</div>
	)
}

function useCalendarScheduleHeader() {
	const { month, year, locale, selectedDate, events } = useCalendarSchedule()

	return React.useMemo(() => {
		const monthYear = new Intl.DateTimeFormat(locale, {
			month: "long",
			year: "numeric",
		}).format(new Date(year, month, 1))

		const monthStart = new Date(year, month, 1)
		const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
		const eventCount = events.filter(
			e => new Date(e.startAt) <= monthEnd && new Date(e.endAt) >= monthStart
		).length

		const formattedDate = selectedDate
			? new Intl.DateTimeFormat(locale, {
					weekday: "long",
					month: "short",
					day: "numeric",
				}).format(selectedDate)
			: null

		let relativeDay: string | null = null
		if (selectedDate) {
			const diff = differenceInDays(selectedDate, new Date())
			if (diff === 0) relativeDay = "Today"
			else if (diff === 1) relativeDay = "Tomorrow"
			else if (diff === -1) relativeDay = "Yesterday"
			else {
				const r = formatDistanceToNow(selectedDate, { addSuffix: true })
				relativeDay = r.charAt(0).toUpperCase() + r.slice(1)
			}
		}

		return { monthYear, eventCount, formattedDate, relativeDay }
	}, [month, year, locale, selectedDate, events])
}

export type SelectedDayEvent = {
	event: CalendarEvent
	formattedTime: string
	relativeLabel: string | null
}

function useSelectedDayEvents(): SelectedDayEvent[] {
	const { selectedDate, events, locale } = useCalendarSchedule()

	const timeFormatter = React.useMemo(
		() =>
			new Intl.DateTimeFormat(locale, {
				hour: "numeric",
				minute: "2-digit",
			}),
		[locale]
	)

	return React.useMemo(() => {
		if (!selectedDate) return []

		const y = selectedDate.getFullYear()
		const m = selectedDate.getMonth()
		const d = selectedDate.getDate()
		const dayStart = new Date(y, m, d)
		const dayEnd = new Date(y, m, d, 23, 59, 59, 999)
		const now = new Date()
		const isToday = isSameDay(selectedDate, now)

		return events
			.filter(e => new Date(e.startAt) <= dayEnd && new Date(e.endAt) >= dayStart)
			.toSorted((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
			.map(event => {
				const start = new Date(event.startAt)
				const end = new Date(event.endAt)
				const formattedTime = `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`

				let relativeLabel: string | null = null
				if (isToday) {
					if (now < start)
						relativeLabel = formatDistanceStrict(start, now, {
							addSuffix: true,
						})
					else if (now <= end) relativeLabel = "Ongoing"
					else
						relativeLabel = formatDistanceStrict(end, now, {
							addSuffix: true,
						})
				}

				return { event, formattedTime, relativeLabel }
			})
	}, [events, selectedDate, timeFormatter])
}

export {
	CalendarScheduleProvider,
	CalendarScheduleMonthPicker,
	CalendarScheduleYearPicker,
	CalendarScheduleGoToToday,
	CalendarScheduleDatePagination,
	CalendarScheduleHeader,
	CalendarScheduleBody,
	CalendarScheduleItem,
	useCalendarSchedule,
	useCalendarScheduleHeader,
	useSelectedDayEvents,
}
