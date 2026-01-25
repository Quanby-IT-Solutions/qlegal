export type CalendarView = "month" | "week" | "day" | "agenda"

export interface CalendarEvent {
	id: string
	title: string
	description?: string
	start: Date
	end: Date
	allDay?: boolean
	color?: EventColor
	location?: string
	metadata?: {
		type?: string
		status?: string
		[key: string]: any
	}
}

export type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"
