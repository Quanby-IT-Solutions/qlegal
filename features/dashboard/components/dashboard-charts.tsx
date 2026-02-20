"use client"

import {
	BarChartIcon,
	File01Icon,
	PieChart01Icon,
	PresentationLineChart01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
	return (
		<>
			<div className="grid gap-8 lg:grid-cols-2">
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
										plugins: {
											legend: {
												position: "top" as const,
											},
											tooltip: {
												mode: "index",
												intersect: false,
											},
										},
										scales: {
											x: {
												grid: {
													display: false,
												},
											},
											y: {
												beginAtZero: true,
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
										plugins: {
											legend: {
												position: "bottom" as const,
											},
											tooltip: {
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

			<div className="grid gap-8 lg:grid-cols-2">
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
											duration: 1200,
											easing: "easeOutQuart",
										},
										interaction: {
											mode: "index" as const,
											intersect: false,
										},
										plugins: {
											legend: {
												display: false,
											},
											tooltip: {
												enabled: true,
												padding: 12,
												backgroundColor: "rgba(0, 0, 0, 0.85)",
												titleColor: "#fff",
												bodyColor: "#fff",
												borderColor: "rgba(255, 255, 255, 0.1)",
												borderWidth: 1,
												cornerRadius: 8,
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
																: "#3b82f6"
														) as string
														const borderColorArray = Array.isArray(context.dataset.borderColor)
															? context.dataset.borderColor
															: []
														const borderColor = (
															typeof borderColorArray[context.dataIndex] === "string"
																? borderColorArray[context.dataIndex]
																: "#1d4ed8"
														) as string
														return {
															borderColor,
															backgroundColor,
															borderWidth: 2,
															borderRadius: 4,
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
													color: "rgba(148, 163, 184, 0.1)",
												},
												ticks: {
													color: "#94a3b8",
													font: {
														size: 11,
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
													color: "#64748b",
													font: {
														size: 12,
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
															ctx.font = "bold 12px Inter, system-ui, sans-serif"
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
							<div className="flex h-[350px] flex-col items-center justify-center text-center">
								<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
									{}
									<HugeiconsIcon
										icon={BarChartIcon}
										size={32}
										className="text-blue-600 dark:text-blue-400"
									/>
								</div>
								<p className="font-semibold text-slate-900 dark:text-slate-100">
									No appointment type data
								</p>
								<p className="text-muted-foreground text-sm">
									Appointment type distribution will appear here
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
										plugins: {
											legend: {
												display: false,
											},
											tooltip: {
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
											},
											y: {
												beginAtZero: true,
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
