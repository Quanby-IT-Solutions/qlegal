"use client"

import { useMemo } from "react"

import { trpc } from "@/services/trpc/client"
import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"
import { EventCalendar } from "./event-calendar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/core/components/ui/card"
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
		<Card>
			<CardHeader>
				<CardTitle>My Schedule</CardTitle>
				<CardDescription>Manage your availability and blocked time slots</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<EventCalendar
					events={calendarEvents}
					onEventAdd={handleEventAdd}
					onEventUpdate={handleEventUpdate}
					onEventDelete={handleEventDelete}
				/>
			</CardContent>
		</Card>
	)
}
