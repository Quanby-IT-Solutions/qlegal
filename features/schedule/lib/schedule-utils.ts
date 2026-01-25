import { addDays, endOfMonth, startOfMonth } from "date-fns"

import type { CalendarEvent } from "../types"
import type { Appointment } from "@/services/drizzle/schema/appointments"

export function transformScheduleToCalendarEvents(
	schedule: {
		regular: { dayOfWeek: number; startTime: string; endTime: string }[]
		blocked: { id: string; date: string; startTime: string; endTime: string; reason: string | null }[]
		recurringBlocked: { id: string; dayOfWeek: number; startTime: string; endTime: string; reason: string | null; isAllDays: boolean }[]
		custom: { id: string; date: string; startTime: string; endTime: string }[]
		myAppointments?: Array<Appointment>
	},
	requests: {
		id: string
		title: string
		principal: { name: string }
		scheduledDate: Date | null
		createdAt: string
		status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"
	}[],
	month: number,
	year: number
): CalendarEvent[] {
	const events: CalendarEvent[] = []
	const monthStart = startOfMonth(new Date(year, month))
	const monthEnd = endOfMonth(monthStart)

	// Add ENP's own appointments (consultations/notarizations)
	if (schedule.myAppointments) {
		schedule.myAppointments.forEach((apt) => {
			const eventDate = new Date(apt.appointmentDate)

			// Only add for current month
			if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
				const isConsultation = apt.type === "CONSULTATION"
				const isDocumentSigning = apt.type === "DOCUMENT_SIGNING"

				// Parse workflow from notes
				const notes = apt.notes || ""
				const isRen = notes.includes("REN") || (!apt.location && isConsultation)
				const isIen = notes.includes("IEN") || (apt.location && isDocumentSigning)

				events.push({
					id: apt.id,
					title: apt.notes ? apt.notes.split("\n")[0] : (isConsultation ? "Consultation" : "Document Signing"),
					start: eventDate,
					end: new Date(eventDate.getTime() + (apt.duration || 60) * 60 * 1000),
					allDay: false,
					color: isConsultation ? "sky" : "emerald",
					location: apt.location || undefined,
					recurrence: undefined,
					eventType: isConsultation ? "consultation" : "notarization",
					mode: isRen ? "ren" : isIen ? "ien" : undefined,
					metadata: {
						type: "enp-appointment",
						appointmentType: apt.type,
						status: apt.status,
						isSelfAppointment: true,
					},
				})
			}
		})
	}

	return events
}
