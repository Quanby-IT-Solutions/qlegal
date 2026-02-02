export type CalendarView = "month" | "week" | "day" | "agenda"

export type RecurrenceType =
	| "does-not-repeat"
	| "daily"
	| "weekly"
	| "monthly"
	| "annually"
	| "weekdays"
	| "custom"

export type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"

export interface CalendarEventMetadata {
	type?: string
	status?: string
	roomId?: string
	timezone?: string
	ownerId?: string
}

export interface CalendarEvent {
	id: string
	title: string
	description?: string
	start: Date
	end: Date
	allDay?: boolean
	color?: EventColor
	location?: string
	recurrence?: RecurrenceType
	eventType?: "consultation" | "notarization"
	mode?: "ren" | "ien"
	metadata?: CalendarEventMetadata
}

export interface BlockTime {
	id: string
	date: Date
	startTime?: Date // undefined if blocking full day
	endTime?: Date // undefined if blocking full day
	reason?: string
	blockType: "full-day" | "time-slot"
}
