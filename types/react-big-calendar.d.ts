declare module "react-big-calendar" {
	import { ComponentType } from "react"
	import { Locale, Day } from "date-fns"

	export type View = "month" | "week" | "day" | "agenda"

	export const Views: {
		readonly MONTH: View
		readonly WEEK: View
		readonly DAY: View
		readonly AGENDA: View
	}

	export interface Event {
		title?: string
		start?: Date
		end?: Date
		resource?: unknown
		allDay?: boolean
		[id: string]: unknown
	}

	export interface CalendarProps {
		localizer: unknown
		events?: Event[]
		startAccessor?: string | ((event: Event) => Date)
		endAccessor?: string | ((event: Event) => Date)
		style?: React.CSSProperties
		view?: View
		date?: Date
		onNavigate?: (date: Date) => void
		onView?: (view: View) => void
		onSelectEvent?: (event: Event) => void
		onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
		selectable?: boolean
		eventPropGetter?: (event: Event) => { style?: React.CSSProperties; className?: string }
		dayPropGetter?: (date: Date) => { style?: React.CSSProperties; className?: string }
		views?: View[]
		popup?: boolean
		showMultiDayTimes?: boolean
	}

	export const Calendar: ComponentType<CalendarProps>

	export interface DateFnsLocalizerConfig {
		format: (date: Date, format: string, options?: { locale?: Locale }) => string
		parse: (str: string, format: string, referenceDate: Date, options?: { locale?: Locale }) => Date
		startOfWeek: (date: Date, options?: { locale?: Locale; weekStartsOn?: Day }) => Date
		getDay: (date: Date) => number
		locales: Record<string, Locale>
	}

	export function dateFnsLocalizer(config: DateFnsLocalizerConfig): unknown
}
