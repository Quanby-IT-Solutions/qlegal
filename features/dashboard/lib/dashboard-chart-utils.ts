import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Legend as ChartLegend,
	Tooltip as ChartTooltip,
	Filler,
	LinearScale,
	LineElement,
	PointElement,
	Title,
} from "chart.js"
import { format, parseISO } from "date-fns"

import { type RouterOutputs } from "@/services/trpc/client"

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	ChartTooltip,
	ChartLegend,
	Filler
)

const COLORS = {
	primary: "#3b82f6",
	secondary: "#8b5cf6",
	success: "#10b981",
	warning: "#f59e0b",
	danger: "#ef4444",
	info: "#06b6d4",
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"]

export const APPOINTMENT_TYPE_GRADIENT_COLORS = [
	{ start: "#3b82f6", end: "#1d4ed8", shadow: "#1e40af" },
	{ start: "#8b5cf6", end: "#6d28d9", shadow: "#5b21b6" },
	{ start: "#10b981", end: "#059669", shadow: "#047857" },
	{ start: "#f59e0b", end: "#d97706", shadow: "#b45309" },
	{ start: "#ef4444", end: "#dc2626", shadow: "#b91c1c" },
	{ start: "#06b6d4", end: "#0891b2", shadow: "#0e7490" },
	{ start: "#ec4899", end: "#db2777", shadow: "#be185d" },
	{ start: "#14b8a6", end: "#0d9488", shadow: "#0f766e" },
]

export function buildActivityChartData(
	activityData: RouterOutputs["dashboard"]["getActivitySummary"] | undefined
) {
	if (!activityData) return { labels: [], datasets: [] }

	const dateMap = new Map<string, { date: string; appointments: number; documents: number }>()

	activityData.appointments.forEach(item => {
		dateMap.set(item.date, { date: item.date, appointments: item.count, documents: 0 })
	})

	activityData.documents.forEach(item => {
		const existing = dateMap.get(item.date)
		if (existing) {
			existing.documents = item.count
		} else {
			dateMap.set(item.date, { date: item.date, appointments: 0, documents: item.count })
		}
	})

	const sortedData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))

	return {
		labels: sortedData.map(item => format(parseISO(item.date), "MMM dd")),
		datasets: [
			{
				label: "Appointments",
				data: sortedData.map(item => item.appointments),
				borderColor: COLORS.primary,
				backgroundColor: `${COLORS.primary}80`,
				fill: true,
				tension: 0.4,
			},
			{
				label: "Documents",
				data: sortedData.map(item => item.documents),
				borderColor: COLORS.secondary,
				backgroundColor: `${COLORS.secondary}80`,
				fill: true,
				tension: 0.4,
			},
		],
	}
}

export function buildAppointmentTypeChartData(
	appointmentTypeData: RouterOutputs["dashboard"]["getAppointmentTypeDistribution"] | undefined
) {
	if (!appointmentTypeData || appointmentTypeData.length === 0) return null

	return {
		labels: appointmentTypeData.map(item => item.type?.replace(/_/g, " ") ?? "Unknown"),
		datasets: [
			{
				label: "Count",
				data: appointmentTypeData.map(item => item.count),
				backgroundColor: appointmentTypeData.map((_, index) => {
					const colors =
						APPOINTMENT_TYPE_GRADIENT_COLORS[index % APPOINTMENT_TYPE_GRADIENT_COLORS.length] ??
						APPOINTMENT_TYPE_GRADIENT_COLORS[0]
					return colors?.start ?? "#3b82f6"
				}),
				borderColor: appointmentTypeData.map((_, index) => {
					const colors =
						APPOINTMENT_TYPE_GRADIENT_COLORS[index % APPOINTMENT_TYPE_GRADIENT_COLORS.length] ??
						APPOINTMENT_TYPE_GRADIENT_COLORS[0]
					return colors?.end ?? "#1d4ed8"
				}),
				borderWidth: 2,
				borderRadius: 8,
				borderSkipped: false,
			},
		],
	}
}

export function buildAppointmentStatusChartData(
	appointmentStatusData: RouterOutputs["dashboard"]["getAppointmentStatusDistribution"] | undefined
) {
	if (!appointmentStatusData || appointmentStatusData.length === 0) return null

	return {
		labels: appointmentStatusData.map(item => item.status ?? "Unknown"),
		datasets: [
			{
				data: appointmentStatusData.map(item => item.count),
				backgroundColor: appointmentStatusData.map(
					(_, index) => PIE_COLORS[index % PIE_COLORS.length]
				),
				borderColor: "#fff",
				borderWidth: 2,
			},
		],
	}
}

export function buildDocumentStatusChartData(
	documentStatusData: RouterOutputs["dashboard"]["getDocumentStatusDistribution"] | undefined
) {
	if (!documentStatusData || documentStatusData.length === 0) return null

	return {
		labels: documentStatusData.map(item => item.status ?? "Unknown"),
		datasets: [
			{
				label: "Documents",
				data: documentStatusData.map(item => item.count),
				backgroundColor: documentStatusData.map(
					(_, index) => PIE_COLORS[index % PIE_COLORS.length]
				),
				borderColor: "#fff",
				borderWidth: 1,
			},
		],
	}
}
