import { useMemo } from "react"
import { isThisMonth, isThisWeek, isToday } from "date-fns"

import type { RouterOutputs } from "@/services/trpc/client"

import type { RequestFilters } from "./use-request-filters"

interface RequestStats {
	total: number
	pending: number
	confirmed: number
	completed: number
	cancelled: number
	todayCount: number
	upcomingCount: number
}

export function useFilteredRequests(
	appointments: RouterOutputs["appointments"]["getMyAppointments"] | undefined,
	filters: RequestFilters
) {
	const filteredAppointments = useMemo(() => {
		if (!appointments) return []

		return appointments.filter(appointment => {
			// Search filter
			const searchLower = filters.search.toLowerCase()
			const matchesSearch =
				!searchLower ||
				(appointment.client.name ?? "").toLowerCase().includes(searchLower) ||
				(appointment.lawyer.name ?? "").toLowerCase().includes(searchLower) ||
				appointment.notes?.toLowerCase().includes(searchLower) ||
				appointment.location?.toLowerCase().includes(searchLower)

			// Status filter
			const matchesStatus = filters.status === "ALL" || appointment.status === filters.status

			// Type filter
			const matchesType = filters.type === "ALL" || appointment.type === filters.type

			// Workflow filter
			let matchesWorkflow = true
			if (filters.workflow !== "ALL") {
				if (filters.workflow === "REN") {
					matchesWorkflow = appointment.meetingLink !== null
				} else if (filters.workflow === "IEN") {
					matchesWorkflow = appointment.location !== null
				}
			}

			return matchesSearch && matchesStatus && matchesType && matchesWorkflow
		})
	}, [appointments, filters])

	const stats = useMemo((): RequestStats => {
		if (!appointments) {
			return {
				total: 0,
				pending: 0,
				confirmed: 0,
				completed: 0,
				cancelled: 0,
				todayCount: 0,
				upcomingCount: 0,
			}
		}

		const now = new Date()

		return {
			total: appointments.length,
			pending: appointments.filter(a => a.status === "PENDING").length,
			confirmed: appointments.filter(a => a.status === "CONFIRMED").length,
			completed: appointments.filter(a => a.status === "COMPLETED").length,
			cancelled: appointments.filter(a => a.status === "CANCELLED").length,
			todayCount: appointments.filter(
				a =>
					isToday(new Date(a.appointmentDate)) &&
					(a.status === "PENDING" || a.status === "CONFIRMED")
			).length,
			upcomingCount: appointments.filter(
				a =>
					new Date(a.appointmentDate) >= now && (a.status === "PENDING" || a.status === "CONFIRMED")
			).length,
		}
	}, [appointments])

	return {
		filteredAppointments,
		stats,
	}
}
