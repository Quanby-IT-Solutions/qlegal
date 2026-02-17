import type { CalendarEvent, Status } from "@/core/components/calendar-schedule"

import type { Appointment } from "@/services/drizzle/schema/appointments"

import type { AppointmentItem } from "../api/appointments.router"

export const STATUS_PENDING: Status = { id: "pending", name: "Pending", color: "#F59E0B" }
export const STATUS_CONFIRMED: Status = { id: "confirmed", name: "Confirmed", color: "#10B981" }
export const STATUS_REJECTED: Status = { id: "rejected", name: "Rejected", color: "#EF4444" }
export const STATUS_IN_PROGRESS: Status = {
	id: "in_progress",
	name: "In Progress",
	color: "#3B82F6",
}
export const STATUS_LAPSED: Status = { id: "lapsed", name: "Lapsed", color: "#D97706" }

export function toCalendarEvent(
	apt: Appointment & { client?: { name?: string | null; image?: string | null } },
	status: Status
): CalendarEvent {
	const eventDate = new Date(apt.appointmentDate)
	const notes = apt.notes?.split("\n")[0]
	return {
		id: apt.id,
		title: notes ?? (apt.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
		description: apt.notes ?? undefined,
		startAt: eventDate,
		status,
		principal: apt.client ? { name: apt.client.name, image: apt.client.image } : undefined,
		appointmentType: apt.type as "NOTARIZATION" | "CONSULTATION" | undefined,
	}
}

export function toCalendarEventFromIncomingItem(item: AppointmentItem): CalendarEvent | null {
	if (item.source === "appointment" && item.appointmentData) {
		const apt = item.appointmentData
		const status: Status = apt.lapsed
			? STATUS_LAPSED
			: apt.status === "PENDING"
				? STATUS_PENDING
				: apt.status === "CONFIRMED"
					? STATUS_CONFIRMED
					: apt.status === "CANCELLED"
						? STATUS_REJECTED
						: STATUS_CONFIRMED
		const eventDate = new Date(apt.appointmentDate)
		return {
			id: apt.id,
			title:
				apt.notes?.split("\n")[0] ??
				(apt.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
			description: apt.notes ?? undefined,
			startAt: eventDate,
			status,
			principal: apt.client ? { name: apt.client.name, image: apt.client.image } : undefined,
			appointmentType: apt.type,
			workflow: item.workflow as "REN" | "IEN" | undefined,
			meta: { source: item.source, incomingItemId: item.id },
		}
	}

	if (item.source === "request") {
		const startAt = new Date(item.createdAt)
		const status: Status =
			item.status === "PENDING"
				? STATUS_PENDING
				: item.status === "REJECTED"
					? STATUS_REJECTED
					: item.status === "IN_PROGRESS"
						? STATUS_IN_PROGRESS
						: STATUS_CONFIRMED
		return {
			id: item.id,
			title: item.title ?? "Request",
			description: item.description ?? undefined,
			startAt,
			status,
			principal: item.principal
				? { name: item.principal.name, image: item.principal.image }
				: undefined,
			workflow: item.workflow as "REN" | "IEN" | undefined,
			meta: { source: item.source, incomingItemId: item.id },
		}
	}

	return null
}

export function buildCalendarEvents(
	incomingRequests: AppointmentItem[],
	myAppointments: (Appointment & { lapsed?: boolean })[]
): CalendarEvent[] {
	const seen = new Set<string>()
	const result: CalendarEvent[] = []

	const add = (event: CalendarEvent) => {
		if (seen.has(event.id)) return
		seen.add(event.id)
		result.push(event)
	}

	for (const item of incomingRequests) {
		const event = toCalendarEventFromIncomingItem(item)
		if (event) add(event)
	}

	for (const appointment of myAppointments) {
		const status: Status = appointment.lapsed
			? STATUS_LAPSED
			: appointment.status === "PENDING"
				? STATUS_PENDING
				: STATUS_CONFIRMED
		add(toCalendarEvent(appointment, status))
	}

	return result
}
