"use client"

import { createContext, useContext } from "react"

import type { CalendarEvent } from "../lib/schedule-types"

interface CalendarDndContextValue {
	activeEvent: CalendarEvent | null
	onEventUpdate?: (event: CalendarEvent) => void
}

const CalendarDndContext = createContext<CalendarDndContextValue>({
	activeEvent: null,
})

interface CalendarDndProviderProps {
	children: React.ReactNode
	onEventUpdate?: (event: CalendarEvent) => void
}

export function CalendarDndProvider({ children, onEventUpdate }: CalendarDndProviderProps) {
	return (
		<CalendarDndContext.Provider value={{ activeEvent: null, onEventUpdate }}>
			{children}
		</CalendarDndContext.Provider>
	)
}

export function useCalendarDnd() {
	const context = useContext(CalendarDndContext)
	if (!context) {
		throw new Error("useCalendarDnd must be used within CalendarDndProvider")
	}
	return context
}
