"use client"

import { useMemo } from "react"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { CalendarEvent } from "../types"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"

import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"

import { trpc } from "@/services/trpc/client"
import { toast } from "sonner"

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
	const today = useMemo(() => new Date(), [])
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
		title: request.title,
		principal: { name: request.principal.name ?? "Unknown" },
		scheduledDate: request.appointmentId ? new Date(request.appointmentId) : null,
		createdAt: request.createdAt,
		status: request.status,
	}))

	const handleEventAdd = (event: CalendarEvent) => {
		// Calculate duration in minutes
		const duration = Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))

		// Determine appointment type based on event type
		const appointmentType = event.eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION"

		// Determine workflow based on mode or type
		const workflow = event.mode?.toLowerCase() === "ren" || (!event.location && event.eventType === "consultation") ? "REN" : "IEN"

		createEnpEvent.mutate({
			title: event.title.trim(),
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

	const handleEventUpdate = (event: CalendarEvent) => {
		const duration = Math.round((event.end.getTime() - event.start.getTime()) / (60 * 1000))
		const appointmentType = event.eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION"
		const workflow = event.mode?.toLowerCase() === "ren" || (!event.location && event.eventType === "consultation") ? "REN" : "IEN"

		updateEnpEvent.mutate({
			appointmentId: event.id,
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
		const myEvents = (scheduleData.myAppointments || []).map(apt => {
			const eventDate = new Date(apt.appointmentDate)
			return {
				id: apt.id,
				title: apt.notes ? apt.notes.split("\n")[0] : "Event",
				start: eventDate,
				end: new Date(eventDate.getTime() + (apt.duration || 60) * 60 * 1000),
				allDay: false,
				color: apt.type === "CONSULTATION" ? "sky" : "emerald",
				location: apt.location || undefined,
				recurrence: undefined,
				eventType: apt.type === "CONSULTATION" ? "consultation" : "notarization",
				mode: undefined,
				metadata: {
					type: "enp-appointment",
					appointmentType: apt.type,
					status: apt.status,
				},
			}
		})

		return transformScheduleToCalendarEvents(
			{
				regular: [],
				blocked: [],
				recurringBlocked: [],
				custom: [],
			},
			transformedRequests,
			today.getMonth(),
			today.getFullYear()
		)
	}, [scheduleData, transformedRequests, today])
}