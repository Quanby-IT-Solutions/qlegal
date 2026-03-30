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

/** Muted, analytical palette — avoids saturated “dashboard candy” colors */
const SERIES = {
	appointments: {
		stroke: "rgb(100, 116, 139)",
		fill: "rgba(100, 116, 139, 0.14)",
	},
	documents: {
		stroke: "rgb(71, 85, 105)",
		fill: "rgba(71, 85, 105, 0.12)",
	},
}

/** Distinct but restrained slices (slate / steel / blue-gray) */
const DISTRIBUTION_COLORS = [
	"rgba(71, 85, 105, 0.92)",
	"rgba(100, 116, 139, 0.9)",
	"rgba(125, 143, 163, 0.88)",
	"rgba(82, 104, 128, 0.9)",
	"rgba(55, 73, 94, 0.92)",
	"rgba(148, 163, 184, 0.85)",
]

const APPOINTMENT_TYPE_BAR_RADIUS = {
	topRight: 3,
	bottomRight: 3,
	topLeft: 0,
	bottomLeft: 0,
} as const

const APPOINTMENT_TYPE_MAX_BAR_THICKNESS = 22

export const APPOINTMENT_TYPE_GRADIENT_COLORS = [
	{ start: "#64748b", end: "#475569", shadow: "#334155" },
	{ start: "#7c8ea0", end: "#5c6b7a", shadow: "#475569" },
	{ start: "#5b7a8f", end: "#4a6275", shadow: "#3d5266" },
	{ start: "#6b7c8d", end: "#556070", shadow: "#3f4854" },
	{ start: "#758696", end: "#5e6d7c", shadow: "#4a5563" },
	{ start: "#8a9aac", end: "#6f7d8c", shadow: "#586674" },
	{ start: "#5a6d82", end: "#485a6e", shadow: "#3a4a5c" },
	{ start: "#6d8194", end: "#566878", shadow: "#44505e" },
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
				borderColor: SERIES.appointments.stroke,
				backgroundColor: SERIES.appointments.fill,
				fill: true,
				tension: 0.3,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 4,
				pointHoverBorderWidth: 2,
				pointBackgroundColor: SERIES.appointments.stroke,
				pointBorderColor: SERIES.appointments.stroke,
			},
			{
				label: "Documents",
				data: sortedData.map(item => item.documents),
				borderColor: SERIES.documents.stroke,
				backgroundColor: SERIES.documents.fill,
				fill: true,
				tension: 0.3,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 4,
				pointHoverBorderWidth: 2,
				pointBackgroundColor: SERIES.documents.stroke,
				pointBorderColor: SERIES.documents.stroke,
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
					return colors?.end ?? "#475569"
				}),
				borderWidth: 0,
				borderRadius: APPOINTMENT_TYPE_BAR_RADIUS,
				borderSkipped: false,
				maxBarThickness: APPOINTMENT_TYPE_MAX_BAR_THICKNESS,
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
					(_, index) => DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]
				),
				borderColor: "transparent",
				borderWidth: 0,
				hoverOffset: 4,
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
					(_, index) => DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]
				),
				borderColor: "transparent",
				borderWidth: 0,
				borderRadius: 3,
				maxBarThickness: 36,
			},
		],
	}
}
