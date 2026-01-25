"use client"

import { useMemo } from "react"

import { trpc } from "@/services/trpc/client"
import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"
import { EventCalendar } from "./event-calendar"
import type { CalendarEvent } from "../types"

interface ScheduleClientProps {
	scheduleData: {
		regular: unknown[]
		blocked: unknown[]
		recurringBlocked: unknown[]
		custom: unknown[]
	}
}

export function ScheduleClient({ scheduleData }: ScheduleClientProps) {
	const today = new Date()

	// Fetch incoming requests on client for calendar events
	const { data: incomingRequests = [] } = trpc.requests.getIncomingRequests.useQuery(undefined)

	// Transform schedule and requests into calendar events
	const calendarEvents = useMemo(() => {
		if (!scheduleData || !incomingRequests) return []
		return transformScheduleToCalendarEvents(
			{
				regular: scheduleData.regular || [],
				blocked: scheduleData.blocked || [],
				recurringBlocked: scheduleData.recurringBlocked || [],
				custom: scheduleData.custom || [],
			},
			incomingRequests,
			today.getMonth(),
			today.getFullYear(),
		)
	}, [scheduleData, incomingRequests])

	const handleEventAdd = (event: CalendarEvent) => {
		// TODO: Implement event creation via tRPC mutation
		console.log("Adding event:", event)
	}

	const handleEventUpdate = (event: CalendarEvent) => {
		// TODO: Implement event update via tRPC mutation
		console.log("Updating event:", event)
	}

	const handleEventDelete = (eventId: string) => {
		// TODO: Implement event deletion via tRPC mutation
		console.log("Deleting event:", eventId)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
				<p className="text-muted-foreground mt-2">
					Manage your availability and blocked time slots
				</p>
			</div>

			<EventCalendar
				events={calendarEvents}
				onEventAdd={handleEventAdd}
				onEventUpdate={handleEventUpdate}
				onEventDelete={handleEventDelete}
			/>
		</div>
	)
}
