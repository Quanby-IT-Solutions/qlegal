import { type inferRouterOutputs } from "@trpc/server"

import type { CalendarEvent, Status } from "@/core/components/calendar-schedule"

import type { AppointmentParticipant as DrizzleAppointmentParticipant } from "@/services/drizzle/schema/appointment-participants"
import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { User } from "@/services/drizzle/schema/auth"
import type { AppRouter } from "@/services/trpc/root"

type RouterOutputs = inferRouterOutputs<AppRouter>

type IncomingRequest = RouterOutputs["appointments"]["getIncomingRequests"][number]
type IncomingAppointment = RouterOutputs["appointments"]["getIncomingAppointmentsForENP"][number]

type EventPrincipal = {
	name?: User["name"] | undefined
	image?: User["image"] | undefined
}

type AppointmentParticipantWithUser = Pick<DrizzleAppointmentParticipant, "participantRole"> & {
	user?: EventPrincipal | null
}

type AppointmentWithPrincipal = Appointment & {
	client?: EventPrincipal | null
	principal?: EventPrincipal | null
	participants?: AppointmentParticipantWithUser[] | null
	lapsed?: boolean
}

export const STATUS_PENDING: Status = { id: "pending", name: "Pending", color: "#F59E0B" }
export const STATUS_CONFIRMED: Status = { id: "confirmed", name: "Confirmed", color: "#10B981" }
export const STATUS_REJECTED: Status = { id: "rejected", name: "Rejected", color: "#EF4444" }
export const STATUS_IN_PROGRESS: Status = {
	id: "in_progress",
	name: "In Progress",
	color: "#3B82F6",
}
export const STATUS_ONGOING: Status = { id: "ongoing", name: "Ongoing", color: "#8B5CF6" }
export const STATUS_COMPLETED: Status = { id: "completed", name: "Completed", color: "#059669" }
export const STATUS_CANCELLED: Status = { id: "cancelled", name: "Cancelled", color: "#EF4444" }
export const STATUS_LAPSED: Status = { id: "lapsed", name: "Lapsed", color: "#D97706" }

function toEventPrincipal(principal?: EventPrincipal | null): EventPrincipal | undefined {
	if (!principal) return undefined
	if (!principal.name && !principal.image) return undefined
	return {
		name: principal.name,
		image: principal.image,
	}
}

function getPrincipalFromParticipants(
	participants?: AppointmentParticipantWithUser[] | null
): EventPrincipal | undefined {
	if (!participants?.length) return undefined

	const participantUser = participants.find(
		participant => participant.participantRole === "PARTICIPANT"
	)?.user

	if (participantUser?.name || participantUser?.image) {
		return toEventPrincipal(participantUser)
	}

	const firstUser = participants.find(
		participant => (participant.user?.name ?? participant.user?.image) !== null
	)?.user
	return toEventPrincipal(firstUser)
}

function resolvePrincipal(source: {
	participants?: AppointmentParticipantWithUser[] | null
	principal?: EventPrincipal | null
	client?: EventPrincipal | null
}): EventPrincipal | undefined {
	return (
		getPrincipalFromParticipants(source.participants) ??
		toEventPrincipal(source.principal) ??
		toEventPrincipal(source.client)
	)
}

export function toCalendarEvent(apt: AppointmentWithPrincipal, status: Status): CalendarEvent {
	const eventDate = new Date(apt.appointmentDate)
	const summary = apt.description?.split("\n")[0]
	return {
		id: apt.id,
		title: summary ?? (apt.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
		description: apt.description ?? undefined,
		startAt: eventDate,
		status,
		color: apt.color ?? undefined,
		principal: resolvePrincipal(apt),
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
		description: item.description,
		client: item.principal,
		lapsed: false,
	}

	const status: Status = appointment.lapsed
		? STATUS_LAPSED
		: appointment.status === "PENDING"
			? STATUS_PENDING
			: appointment.status === "CONFIRMED"
				? STATUS_CONFIRMED
				: appointment.status === "ONGOING"
					? STATUS_ONGOING
					: appointment.status === "COMPLETED"
						? STATUS_COMPLETED
						: appointment.status === "CANCELLED"
							? STATUS_CANCELLED
							: STATUS_CONFIRMED
	const eventDate = new Date(appointment.appointmentDate)

	return {
		id: appointment.id,
		title:
			appointment.description?.split("\n")[0] ??
			(appointment.type === "NOTARIZATION" ? "Notarization" : "Consultation"),
		description: appointment.description ?? undefined,
		startAt: eventDate,
		status,
		color: appointment.color ?? status.color,
		principal: resolvePrincipal(appointment) ?? toEventPrincipal(item.principal),
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
					: item.status === "COMPLETED"
						? STATUS_COMPLETED
						: STATUS_CONFIRMED

	return {
		id: item.id,
		title: item.title ?? "Request",
		description: item.description ?? undefined,
		startAt,
		status,
		color: status.color,
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
	myAppointments: (AppointmentWithPrincipal & { lapsed?: boolean })[]
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
				: appointment.status === "CONFIRMED"
					? STATUS_CONFIRMED
					: appointment.status === "ONGOING"
						? STATUS_ONGOING
						: appointment.status === "COMPLETED"
							? STATUS_COMPLETED
							: appointment.status === "CANCELLED"
								? STATUS_CANCELLED
								: STATUS_CONFIRMED
		add(toCalendarEvent(appointment, status))
	}

	return result
}
