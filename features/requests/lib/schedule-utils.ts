import { Feature } from "@/core/components/kibo-ui/calendar"
import { addDays, startOfMonth, endOfMonth, getDay } from "date-fns"

export function transformScheduleToCalendarFeatures(
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
): Feature[] {
	const features: Feature[] = []
	const monthStart = startOfMonth(new Date(year, month))
	const monthEnd = endOfMonth(monthStart)

	// 1. Add one-time blocked slots as features
	schedule.blocked.forEach((slot) => {
		features.push({
			id: slot.id,
			name: slot.reason || "Blocked",
			startAt: new Date(`${slot.date}T${slot.startTime}:00`),
			endAt: new Date(`${slot.date}T${slot.endTime || "23:59"}:00`),
			status: {
				id: "blocked",
				name: "Blocked",
				color: "#ef4444", // Red
			},
		})
	})

	// 2. Add recurring blocked slots for each day in month
	schedule.recurringBlocked.forEach((recurring) => {
		// Determine which days to apply the block to
		const targetDays = recurring.isAllDays
			? [0, 1, 2, 3, 4, 5, 6] // All days of week
			: [recurring.dayOfWeek] // Specific day

		// Generate blocked slot for each target day in the month
		let currentDay = monthStart
		while (currentDay <= monthEnd) {
			if (targetDays.includes(currentDay.getDay())) {
				features.push({
					id: `${recurring.id}-${currentDay.toISOString()}`,
					name: recurring.reason || "Blocked",
					startAt: new Date(
						currentDay.getFullYear(),
						currentDay.getMonth(),
						currentDay.getDate(),
						parseInt(recurring.startTime.split(":")[0], 10),
						parseInt(recurring.startTime.split(":")[1], 10)
					),
					endAt: new Date(
						currentDay.getFullYear(),
						currentDay.getMonth(),
						currentDay.getDate(),
						parseInt(recurring.endTime.split(":")[0], 10),
						parseInt(recurring.endTime.split(":")[1], 10)
					),
					status: {
						id: "recurring-blocked",
						name: "Recurring Blocked",
						color: "#dc2626", // Darker red for recurring
					},
				})
			}
			currentDay = addDays(currentDay, 1)
		}
	})

	// 3. Add incoming requests as features
	requests.forEach((request) => {
		const requestDate = request.scheduledDate
			? new Date(request.scheduledDate)
			: new Date(request.createdAt)

		// Only add requests for the current month
		if (
			requestDate.getFullYear() === year &&
			requestDate.getMonth() === month
		) {
			features.push({
				id: request.id,
				name: `${request.principal.name} - ${request.title}`,
				startAt: requestDate,
				endAt: new Date(requestDate.getTime() + 60 * 60 * 1000), // Assume 1 hour
				status: {
					id: request.status.toLowerCase(),
					name: request.status,
					color: getStatusColor(request.status),
				},
			})
		}
	})

	return features
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
