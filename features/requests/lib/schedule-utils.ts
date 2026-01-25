import { addDays, startOfMonth, endOfMonth } from "date-fns"
import type { CalendarEvent } from "@/core/components/ui/event-calendar"

export function transformScheduleToCalendarEvents(
	schedule: {
		regular: { dayOfWeek: number; startTime: string; endTime: string }[]
		blocked: {
			id: string
			date: string
			startTime: string
			endTime: string
			reason: string | null
		}[]
		recurringBlocked: {
			id: string
			dayOfWeek: number
			startTime: string
			endTime: string
			reason: string | null
			isAllDays: boolean
		}[]
		custom: {
			id: string
			date: string
			startTime: string
			endTime: string
		}[]
	},
	requests: {
		id: string
		title: string
		principal: {
			name: string
		}
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

	// 1. Add one-time blocked slots as events
	schedule.blocked.forEach((slot) => {
		events.push({
			id: slot.id,
			title: slot.reason || "Blocked",
			start: new Date(`${slot.date}T${slot.startTime}:00`),
			end: new Date(`${slot.date}T${slot.endTime || "23:59"}:00`),
			metadata: {
				type: "blocked",
				color: "#ef4444", // Red
			},
		})
	})

	// 2. Add recurring blocked slots for each day in month
	schedule.recurringBlocked.forEach((recurring) => {
		// Determine which days to apply block to
		const targetDays = recurring.isAllDays
			? [0, 1, 2, 3, 4, 5, 6] // All days of week
			: [recurring.dayOfWeek] // Specific day

		// Generate blocked slot for each target day in month
		let currentDay = monthStart
		while (currentDay <= monthEnd) {
			if (targetDays.includes(currentDay.getDay())) {
				events.push({
					id: `${recurring.id}-${currentDay.toISOString()}`,
					title: recurring.reason || "Blocked",
					start: new Date(
						currentDay.getFullYear(),
						currentDay.getMonth(),
						currentDay.getDate(),
						parseInt(recurring.startTime.split(":")[0], 10),
						parseInt(recurring.startTime.split(":")[1], 10)
					),
					end: new Date(
						currentDay.getFullYear(),
						currentDay.getMonth(),
						currentDay.getDate(),
						parseInt(recurring.endTime.split(":")[0], 10),
						parseInt(recurring.endTime.split(":")[1], 10)
					),
					metadata: {
						type: "recurring-blocked",
						color: "#dc2626", // Darker red for recurring
					},
				})
			}
			currentDay = addDays(currentDay, 1)
		}
	})

	// 3. Add incoming requests as events
	requests.forEach((request) => {
		const requestDate = request.scheduledDate
			? new Date(request.scheduledDate)
			: new Date(request.createdAt)

		// Only add requests for current month
		if (
			requestDate.getFullYear() === year &&
			requestDate.getMonth() === month
		) {
			events.push({
				id: request.id,
				title: `${request.principal.name} - ${request.title}`,
				start: requestDate,
				end: new Date(requestDate.getTime() + 60 * 60 * 1000), // Assume 1 hour
				metadata: {
					type: "request",
					status: request.status,
					color: getStatusColor(request.status),
				},
			})
		}
	})

	return events
}

function getStatusColor(status: string): string {
	switch (status) {
		case "PENDING":
			return "#eab308" // Yellow
		case "IN_PROGRESS":
			return "#3b82f6" // Blue
		case "COMPLETED":
			return "#22c55e" // Green
		case "REJECTED":
			return "#ef4444" // Red
		default:
			return "#6b7280" // Gray
	}
}
