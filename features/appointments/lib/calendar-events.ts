import { type inferRouterOutputs } from "@trpc/server"

import type { CalendarEvent, Status } from "@/core/components/calendar-schedule"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { AppRouter } from "@/services/trpc/root"

type IncomingRequest = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"][number]
type IncomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getIncomingAppointmentsForENP"][number]

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

const toWorkflow = (workflow: string): "REN" | "IEN" | undefined => {
	if (workflow === "REN" || workflow === "IEN") return workflow
	return undefined
}

export function toCalendarEventFromIncomingAppointment(item: IncomingAppointment): CalendarEvent {
	const apt = item.appointmentData
	const appointment = apt ?? {
		id: item.id,
		type: item.title === "Notarization" ? "NOTARIZATION" : "CONSULTATION",
		status: item.status,
		appointmentDate: item.createdAt,
		notes: item.description,
		client: item.principal,
		lapsed: false,
	}

	const status: Status = appointment.lapsed
		? STATUS_LAPSED
		: appointment.status === "PENDING"
			? STATUS_PENDING
			: appointment.status === "CONFIRMED"
				? STATUS_CONFIRMED
				: appointment.status === "CANCELLED"
					? STATUS_REJECTED
					: STATUS_CONFIRMED
	const eventDate = new Date(appointment.appointmentDate)

	return {
		id: appointment.id,
		title:
			appointment.notes?.split("\n")[0] ??
			(appointment.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
		description: appointment.notes ?? undefined,
		startAt: eventDate,
		status,
		principal: appointment.client
			? { name: appointment.client.name, image: appointment.client.image }
			: undefined,
		appointmentType: appointment.type,
		workflow: toWorkflow(item.workflow),
		meta: { source: "appointment", incomingItemId: item.id },
	}
}

export function toCalendarEventFromIncomingRequest(item: IncomingRequest): CalendarEvent {
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
		workflow: toWorkflow(item.workflow),
		meta: { source: "request", incomingItemId: item.id },
	}
}

export function buildCalendarEvents(
	incomingRequests: IncomingRequest[],
	incomingAppointments: IncomingAppointment[],
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
		add(toCalendarEventFromIncomingRequest(item))
	}

	for (const item of incomingAppointments) {
		add(toCalendarEventFromIncomingAppointment(item))
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
