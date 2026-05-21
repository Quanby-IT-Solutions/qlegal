"use client"

import { useMemo } from "react"
import {
	BarChartIcon,
	File01Icon,
	PieChart01Icon,
	PresentationLineChart01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"
import { Bar, Doughnut, Line } from "react-chartjs-2"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import {
	APPOINTMENT_TYPE_GRADIENT_COLORS,
	type buildActivityChartData,
	type buildAppointmentStatusChartData,
	type buildAppointmentTypeChartData,
	type buildDocumentStatusChartData,
} from "../lib/dashboard-chart-utils"

interface DashboardChartsProps {
	activityChartData: ReturnType<typeof buildActivityChartData>
	appointmentTypeChartData: ReturnType<typeof buildAppointmentTypeChartData>
	appointmentStatusChartData: ReturnType<typeof buildAppointmentStatusChartData>
	documentStatusChartData: ReturnType<typeof buildDocumentStatusChartData>
	isLoadingActivity: boolean
	isLoadingAppointmentTypes: boolean
	isLoadingAppointmentStatus: boolean
	isLoadingDocumentStatus: boolean
}

export function DashboardCharts({
	activityChartData,
	appointmentTypeChartData,
	appointmentStatusChartData,
	documentStatusChartData,
	isLoadingActivity,
	isLoadingAppointmentTypes,
	isLoadingAppointmentStatus,
	isLoadingDocumentStatus,
}: DashboardChartsProps) {
	const { resolvedTheme } = useTheme()
	const chartUi = useMemo(() => {
		const dark = resolvedTheme === "dark"
		return {
			tick: dark ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)",
			grid: dark ? "rgba(148, 163, 184, 0.08)" : "rgba(100, 116, 139, 0.12)",
			legend: dark ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)",
			tooltipBg: dark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)",
			tooltipBody: dark ? "rgb(226, 232, 240)" : "rgb(51, 65, 85)",
			tooltipBorder: dark ? "rgba(148, 163, 184, 0.12)" : "rgba(100, 116, 139, 0.2)",
		}
	}, [resolvedTheme])

	const lineLegendLabels = useMemo(
		() => ({
			color: chartUi.legend,
			font: { size: 11, family: "system-ui, sans-serif" },
			boxWidth: 10,
			boxHeight: 10,
			padding: 10,
			usePointStyle: true,
			pointStyle: "line" as const,
		}),
		[chartUi.legend]
	)

	return (
		<>
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<HugeiconsIcon icon={PresentationLineChart01Icon} size={20} />
									Activity Trend
								</CardTitle>
								<CardDescription>Last 30 days activity overview</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoadingActivity ? (
							<Skeleton className="h-[300px] w-full" />
						) : activityChartData.labels.length > 0 ? (
							<div className="h-[300px]">
								<Line
									data={activityChartData}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										interaction: {
											mode: "index",
											intersect: false,
										},
										plugins: {
											legend: {
												position: "top" as const,
												align: "end" as const,
												labels: lineLegendLabels,
											},
											tooltip: {
												mode: "index",
												intersect: false,
												backgroundColor: chartUi.tooltipBg,
												titleColor: chartUi.tooltipBody,
												bodyColor: chartUi.tooltipBody,
												borderColor: chartUi.tooltipBorder,
												borderWidth: 1,
												padding: 10,
												cornerRadius: 6,
												displayColors: true,
												boxPadding: 4,
											},
										},
										scales: {
											x: {
												grid: {
													display: false,
												},
												ticks: {
													color: chartUi.tick,
													font: { size: 10, family: "system-ui, sans-serif" },
													maxRotation: 0,
													autoSkip: true,
													maxTicksLimit: 8,
												},
												border: { display: false },
											},
											y: {
												beginAtZero: true,
												grid: {
													color: chartUi.grid,
													lineWidth: 1,
													drawTicks: false,
												},
												ticks: {
													color: chartUi.tick,
													font: { size: 10, family: "system-ui, sans-serif" },
													padding: 8,
													callback(value) {
														return Number.isInteger(value) ? value : ""
													},
												},
												border: { display: false },
											},
										},
									}}
								/>
							</div>
						) : (
							<div className="text-muted-foreground flex h-[300px] items-center justify-center">
								No activity data yet
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<HugeiconsIcon icon={PieChart01Icon} size={20} />
									Appointment Status
								</CardTitle>
								<CardDescription>Distribution by status</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoadingAppointmentStatus ? (
							<Skeleton className="h-[300px] w-full" />
						) : appointmentStatusChartData ? (
							<div className="h-[300px]">
								<Doughnut
									data={appointmentStatusChartData}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										cutout: "70%",
										plugins: {
											legend: {
												position: "bottom" as const,
												labels: {
													color: chartUi.legend,
													font: { size: 11, family: "system-ui, sans-serif" },
													boxWidth: 10,
													boxHeight: 10,
													padding: 12,
													usePointStyle: true,
												},
											},
											tooltip: {
												backgroundColor: chartUi.tooltipBg,
												titleColor: chartUi.tooltipBody,
												bodyColor: chartUi.tooltipBody,
												borderColor: chartUi.tooltipBorder,
												borderWidth: 1,
												padding: 10,
												cornerRadius: 6,
												callbacks: {
													label: context => {
														const label = context.label ?? ""
														const value = context.parsed
														const total = context.dataset.data.reduce(
															(a: number, b: number) => a + b,
															0
														)
														const percentage = ((value / total) * 100).toFixed(0)
														return `${label}: ${value} (${percentage}%)`
													},
												},
											},
										},
									}}
								/>
							</div>
						) : (
							<div className="text-muted-foreground flex h-[300px] items-center justify-center">
								No appointment data yet
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<HugeiconsIcon icon={BarChartIcon} size={20} />
									Appointment Types
								</CardTitle>
								<CardDescription>Distribution by type</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoadingAppointmentTypes ? (
							<Skeleton className="h-[350px] w-full" />
						) : appointmentTypeChartData ? (
							<div className="h-[350px]">
								<Bar
									data={appointmentTypeChartData}
									options={{
										indexAxis: "y" as const,
										responsive: true,
										maintainAspectRatio: false,
										animation: {
											duration: 600,
											easing: "easeOutQuart",
										},
										interaction: {
											mode: "index" as const,
											intersect: false,
										},
										datasets: {
											bar: {
												categoryPercentage: 0.62,
												barPercentage: 0.9,
											},
										},
										plugins: {
											legend: {
												display: false,
											},
											tooltip: {
												enabled: true,
												padding: 10,
												backgroundColor: chartUi.tooltipBg,
												titleColor: chartUi.tooltipBody,
												bodyColor: chartUi.tooltipBody,
												borderColor: chartUi.tooltipBorder,
												borderWidth: 1,
												cornerRadius: 6,
												displayColors: true,
												callbacks: {
													title: context => {
														return context[0]?.label ?? ""
													},
													label: context => {
														if (!context.parsed) return ""
														const value = context.parsed.x!
														const numericData = context.dataset.data.filter(
															(d): d is number => typeof d === "number"
														)
														const total = numericData.reduce((a, b) => a + b, 0)
														const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
														return `${value} appointment${value !== 1 ? "s" : ""} (${percentage}%)`
													},
													labelColor: context => {
														const backgroundColorArray = Array.isArray(
															context.dataset.backgroundColor
														)
															? context.dataset.backgroundColor
															: []
														const backgroundColor = (
															typeof backgroundColorArray[context.dataIndex] === "string"
																? backgroundColorArray[context.dataIndex]
																: "#64748b"
														) as string
														const borderColorArray = Array.isArray(context.dataset.borderColor)
															? context.dataset.borderColor
															: []
														const borderColor = (
															typeof borderColorArray[context.dataIndex] === "string"
																? borderColorArray[context.dataIndex]
																: "#475569"
														) as string
														return {
															borderColor,
															backgroundColor,
															borderWidth: 1,
															borderRadius: 3,
														}
													},
												},
											},
										},
										scales: {
											x: {
												beginAtZero: true,
												border: {
													display: false,
												},
												grid: {
													color: chartUi.grid,
													lineWidth: 1,
													drawTicks: false,
												},
												ticks: {
													color: chartUi.tick,
													font: {
														size: 10,
														family: "system-ui, sans-serif",
													},
													padding: 8,
													callback(value) {
														return Number.isInteger(value) ? value : ""
													},
												},
											},
											y: {
												border: {
													display: false,
												},
												grid: {
													display: false,
												},
												ticks: {
													color: chartUi.tick,
													font: {
														size: 11,
														family: "system-ui, sans-serif",
													},
													padding: 10,
												},
											},
										},
									}}
									plugins={[
										{
											id: "valueLabels",
											afterDatasetsDraw: chart => {
												const ctx = chart.ctx
												chart.data.datasets.forEach((dataset, i) => {
													const meta = chart.getDatasetMeta(i)
													meta.data.forEach((bar: { x: number; y: number }, index: number) => {
														const value =
															typeof dataset.data[index] === "number" ? dataset.data[index] : 0
														if (value > 0) {
															const colors =
																APPOINTMENT_TYPE_GRADIENT_COLORS[
																	index % APPOINTMENT_TYPE_GRADIENT_COLORS.length
																] ?? APPOINTMENT_TYPE_GRADIENT_COLORS[0]
															ctx.save()
															ctx.fillStyle = colors?.end ?? "#1e293b"
															ctx.font = "600 11px system-ui, sans-serif"
															ctx.textAlign = "left"
															ctx.textBaseline = "middle"
															const x = (bar as { x: number }).x + 8
															const y = (bar as { y: number }).y
															ctx.fillText(value.toString(), x, y)
															ctx.restore()
														}
													})
												})
											},
										},
									]}
								/>
							</div>
						) : (
							<div className="flex h-[350px] flex-col items-center justify-center gap-2 text-center">
								<div className="bg-muted/50 text-muted-foreground border-border/60 mb-1 flex size-12 items-center justify-center rounded-md border">
									<HugeiconsIcon icon={BarChartIcon} size={22} />
								</div>
								<p className="text-foreground text-sm font-medium">No appointment type data</p>
								<p className="text-muted-foreground max-w-[240px] text-xs leading-relaxed">
									Distribution by type will appear when you have appointments.
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<HugeiconsIcon icon={File01Icon} size={20} />
									Document Status
								</CardTitle>
								<CardDescription>Documents by status</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoadingDocumentStatus ? (
							<Skeleton className="h-[300px] w-full" />
						) : documentStatusChartData ? (
							<div className="h-[300px]">
								<Bar
									data={documentStatusChartData}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										animation: {
											duration: 600,
											easing: "easeOutQuart",
										},
										datasets: {
											bar: {
												categoryPercentage: 0.65,
												barPercentage: 0.82,
											},
										},
										plugins: {
											legend: {
												display: false,
											},
											tooltip: {
												backgroundColor: chartUi.tooltipBg,
												titleColor: chartUi.tooltipBody,
												bodyColor: chartUi.tooltipBody,
												borderColor: chartUi.tooltipBorder,
												borderWidth: 1,
												padding: 10,
												cornerRadius: 6,
												callbacks: {
													label: context => `Documents: ${context.parsed.y}`,
												},
											},
										},
										scales: {
											x: {
												grid: {
													display: false,
												},
												ticks: {
													color: chartUi.tick,
													font: { size: 10, family: "system-ui, sans-serif" },
													maxRotation: 45,
													minRotation: 0,
												},
												border: { display: false },
											},
											y: {
												beginAtZero: true,
												grid: {
													color: chartUi.grid,
													lineWidth: 1,
													drawTicks: false,
												},
												ticks: {
													color: chartUi.tick,
													font: { size: 10, family: "system-ui, sans-serif" },
													padding: 8,
													callback(value) {
														return Number.isInteger(value) ? value : ""
													},
												},
												border: { display: false },
											},
										},
									}}
								/>
							</div>
						) : (
							<div className="text-muted-foreground flex h-[300px] items-center justify-center">
								No document data yet
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	)
}
