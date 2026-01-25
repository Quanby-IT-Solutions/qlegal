"use client"

import { useMemo } from "react"

import { trpc } from "@/services/trpc/client"
import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"
import { EventCalendar } from "./event-calendar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/core/components/ui/card"
import type { CalendarEvent } from "../types"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"

interface ScheduleClientProps {
	scheduleData: {
		regular: EnpAvailability[]
		blocked: EnpAvailability[]
		recurringBlocked: EnpAvailability[]
		custom: EnpAvailability[]
	}
}

export function ScheduleClient({ scheduleData }: ScheduleClientProps) {
	// Wrap today in useMemo to avoid re-renders
	const today = useMemo(() => new Date(), [])

	// Fetch incoming requests on client for calendar events
	const { data: incomingRequests = [] } = trpc.requests.getIncomingRequests.useQuery(undefined)

	// Transform schedule and requests into calendar events
	const calendarEvents = useMemo(() => {
		if (!scheduleData || !incomingRequests) return []

		// Transform regular availability (filter out records with null dayOfWeek)
		const regular = scheduleData.regular
			.filter(slot => slot.dayOfWeek !== null)
			.map(slot => ({
				dayOfWeek: slot.dayOfWeek!,
				startTime: slot.startTime,
				endTime: slot.endTime,
			}))

		// Transform blocked slots
		const blocked = scheduleData.blocked
			.filter(slot => slot.date !== null)
			.map(slot => ({
				id: slot.id,
				date: slot.date!,
				startTime: slot.startTime,
				endTime: slot.endTime,
				reason: slot.reason,
			}))

		// Transform recurring blocked slots
		const recurringBlocked = scheduleData.recurringBlocked
			.filter(slot => slot.dayOfWeek !== null)
			.map(slot => ({
				id: slot.id,
				dayOfWeek: slot.dayOfWeek!,
				startTime: slot.startTime,
				endTime: slot.endTime,
				reason: slot.reason,
				isAllDays: slot.isAllDays ?? false,
			}))

		// Transform custom availability
		const custom = scheduleData.custom
			.filter(slot => slot.date !== null)
			.map(slot => ({
				id: slot.id,
				date: slot.date!,
				startTime: slot.startTime,
				endTime: slot.endTime,
			}))

		// Transform incoming requests to match expected format
		const transformedRequests = incomingRequests.map((request) => ({
			id: request.id,
			title: request.title,
			principal: { name: request.principal.name ?? "Unknown" },
			scheduledDate: request.appointmentId ? new Date(request.appointmentId) : null,
			createdAt: request.createdAt.toISOString(),
			status: request.status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
		}))

		return transformScheduleToCalendarEvents(
			{
				regular,
				blocked,
				recurringBlocked,
				custom,
			},
			transformedRequests,
			today.getMonth(),
			today.getFullYear(),
		)
	}, [scheduleData, incomingRequests, today])

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
