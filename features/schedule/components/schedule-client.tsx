"use client"

import { useMemo } from "react"
import { toast } from "sonner"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { trpc } from "@/services/trpc/client"

import type { CalendarEvent, EventColor } from "../types"
import { EventCalendar } from "./event-calendar"

interface ScheduleClientProps {
	scheduleData: {
		regular: EnpAvailability[]
		blocked: EnpAvailability[]
		recurringBlocked: EnpAvailability[]
		custom: EnpAvailability[]
		myAppointments?: Appointment[]
	}
}

export function ScheduleClient({ scheduleData }: ScheduleClientProps) {
	const utils = trpc.useUtils()

	// Create event mutations
	const createEnpEvent = trpc.schedule.createEnpEvent.useMutation({
		onSuccess: () => {
			void utils.requests.getEnpSchedule.invalidate()
			void utils.schedule.getEnpScheduleWithEvents.invalidate()
			toast.success("Event created successfully")
		},
		onError: error => {
			toast.error("Failed to create event", {
				description: error.message,
			})
		},
	})

	const updateEnpEvent = trpc.schedule.updateEnpEvent.useMutation({
		onSuccess: () => {
			void utils.requests.getEnpSchedule.invalidate()
			void utils.schedule.getEnpScheduleWithEvents.invalidate()
			toast.success("Event updated")
		},
		onError: error => {
			toast.error("Failed to update event", {
				description: error.message,
			})
		},
	})

	const deleteEnpEvent = trpc.schedule.deleteEnpEvent.useMutation({
		onSuccess: () => {
			void utils.requests.getEnpSchedule.invalidate()
			void utils.schedule.getEnpScheduleWithEvents.invalidate()
			toast.success("Event deleted")
		},
		onError: error => {
			toast.error("Failed to delete event", {
				description: error.message,
			})
		},
	})

	// Fetch incoming requests on client for calendar events
	const { data: incomingRequests = [] } = trpc.requests.getIncomingRequests.useQuery(undefined)

	// Transform incoming requests
	const transformedRequests = incomingRequests.map(request => ({
		id: request.id,
		title: request.title ?? "Request",
		principal: { name: request.principal.name ?? "Unknown" },
		scheduledDate: null as Date | null, // Appointment relation is not loaded in this query
		createdAt: request.createdAt.toISOString(),
		status: request.status as "PENDING" | "COMPLETED" | "REJECTED" | "IN_PROGRESS",
	}))

	const handleEventAdd = (event: CalendarEvent) => {
		// Calculate duration in minutes
		const duration = Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))

		// Extract time strings (HH:MM format)
		const startTime = `${event.start.getHours().toString().padStart(2, "0")}:${event.start.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${event.end.getHours().toString().padStart(2, "0")}:${event.end.getMinutes().toString().padStart(2, "0")}`

		// Determine appointment type based on event type
		const appointmentType = event.eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION"

		// Determine workflow based on mode or type
		const workflow =
			event.mode?.toLowerCase() === "ren" || (!event.location && event.eventType === "consultation")
				? "REN"
				: "IEN"

		createEnpEvent.mutate({
			title: event.title.trim(),
			description: event.description?.trim(),
			appointmentDate: event.start,
			startTime,
			endTime,
			duration,
			allDay: event.allDay ?? false,
			location: event.location?.trim(),
			type: appointmentType,
			workflow,
			notes: event.description?.trim(),
		})
	}

	const handleEventUpdate = (event: CalendarEvent) => {
		const duration = Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))

		// Extract time strings (HH:MM format)
		const startTime = `${event.start.getHours().toString().padStart(2, "0")}:${event.start.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${event.end.getHours().toString().padStart(2, "0")}:${event.end.getMinutes().toString().padStart(2, "0")}`

		const appointmentType = event.eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION"
		const workflow =
			event.mode?.toLowerCase() === "ren" || (!event.location && event.eventType === "consultation")
				? "REN"
				: "IEN"

		updateEnpEvent.mutate({
			appointmentId: event.id,
			startTime,
			endTime,
			title: event.title?.trim(),
			description: event.description?.trim(),
			appointmentDate: event.start,
			duration,
			allDay: event.allDay ?? false,
			location: event.location?.trim(),
			type: appointmentType,
			workflow,
			notes: event.description?.trim(),
		})
	}

	const handleEventDelete = (eventId: string) => {
		deleteEnpEvent.mutate({ appointmentId: eventId })
	}

	// Transform schedule data to calendar events
	const calendarEvents = useMemo(() => {
		if (!scheduleData) return []

		// Transform ENP appointments to calendar events
		const myEvents = (scheduleData.myAppointments ?? []).map(apt => {
			const eventDate = new Date(apt.appointmentDate)
			const notes = apt.notes?.split("\n")[0]
			const color: EventColor = apt.type === "CONSULTATION" ? "sky" : "emerald"
			const eventType: "consultation" | "notarization" =
				apt.type === "CONSULTATION" ? "consultation" : "notarization"
			return {
				id: apt.id,
				title: notes ?? "Event",
				start: eventDate,
				end: new Date(eventDate.getTime() + (apt.duration ?? 60) * 60 * 1000),
				allDay: false,
				color,
				location: apt.location ?? undefined,
				recurrence: undefined,
				eventType,
				mode: undefined,
				metadata: {
					type: "enp-appointment",
					appointmentType: apt.type,
					status: apt.status,
				},
			}
		})

	// DEBUG: Log transformation
		console.log("DEBUG [schedule-client] Transformed events:", myEvents.length, "My appointments:", scheduleData.myAppointments?.length)

		// Merge myEvents with transformed requests
		const allEvents: CalendarEvent[] = [
			...myEvents,
			...transformedRequests.map(req => {
				const reqDate = req.scheduledDate ?? new Date(req.createdAt)
				const color: EventColor =
					req.status === "PENDING" ? "amber" : req.status === "COMPLETED" ? "emerald" : "rose"
				return {
					id: req.id,
					title: req.title,
					start: reqDate,
					end: new Date(reqDate.getTime() + 60 * 60 * 1000),
					allDay: false,
					color,
					metadata: {
						type: "request",
						status: req.status,
					},
				}
			}),
		]

		return allEvents
	}, [scheduleData, transformedRequests])

	return (
		<EventCalendar
			events={calendarEvents}
			onEventAdd={handleEventAdd}
			onEventUpdate={handleEventUpdate}
			onEventDelete={handleEventDelete}
		/>
	)
}
