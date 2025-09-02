"use client"

import { useState } from "react"
import {
	Area,
	AreaChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"

interface SigningTimelineChartProps {
	userId: string
}

export function SigningTimelineChart({ userId }: SigningTimelineChartProps) {
	const [selectedPeriod, setSelectedPeriod] = useState<
		"week" | "month" | "year"
	>("month")

	const { data: timelineData, isLoading } =
		trpc.mySigned.getSigningTimeline.useQuery(
			{
				userId,
				period: selectedPeriod
			},
			{
				enabled: !!userId,
				staleTime: 1000 * 60 * 5 // 5 minutes
			}
		)

	const formatXAxisLabel = (value: string) => {
		switch (selectedPeriod) {
			case "week":
				return new Date(value).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric"
				})
			case "month":
				return new Date(value + "-01").toLocaleDateString("en-US", {
					year: "numeric",
					month: "short"
				})
			case "year":
				return value
			default:
				return value
		}
	}

	const formatTooltipLabel = (value: string) => {
		switch (selectedPeriod) {
			case "week":
				return new Date(value).toLocaleDateString("en-US", {
					weekday: "long",
					year: "numeric",
					month: "long",
					day: "numeric"
				})
			case "month":
				return new Date(value + "-01").toLocaleDateString("en-US", {
					year: "numeric",
					month: "long"
				})
			case "year":
				return value
			default:
				return value
		}
	}

	const getPeriodLabel = () => {
		switch (selectedPeriod) {
			case "week":
				return "Last 7 Days"
			case "month":
				return "Last 12 Months"
			case "year":
				return "Last 5 Years"
			default:
				return "Timeline"
		}
	}

	if (isLoading) {
		return (
			<Card className="border border-border bg-background dark:bg-muted/60">
				<CardHeader className="pb-6">
					<div className="flex items-center justify-between">
						<div>
							<Skeleton className="mb-2 h-6 w-48" />
							<Skeleton className="h-4 w-64" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-16" />
							<Skeleton className="h-9 w-16" />
							<Skeleton className="h-9 w-16" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[280px] w-full" />
				</CardContent>
			</Card>
		)
	}

	const timeline = timelineData?.timeline ?? []
	const totalSigned = timelineData?.totalSigned ?? 0

	return (
		<Card className="border border-border bg-background dark:bg-muted/60">
			<CardHeader className="pb-6">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-3 text-xl font-semibold text-foreground">
							Signing Activity
							<Badge
								variant="secondary"
								className="bg-muted text-muted-foreground"
							>
								{totalSigned} signed
							</Badge>
						</CardTitle>
						<CardDescription className="text-muted-foreground">
							{getPeriodLabel()} • Track your document signing patterns
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button
							variant={selectedPeriod === "week" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedPeriod("week")}
							className="text-xs"
						>
							Week
						</Button>
						<Button
							variant={selectedPeriod === "month" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedPeriod("month")}
							className="text-xs"
						>
							Month
						</Button>
						<Button
							variant={selectedPeriod === "year" ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedPeriod("year")}
							className="text-xs"
						>
							Year
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{timeline.length > 0 ? (
					<div className="h-[280px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={timeline}
								margin={{
									top: 10,
									right: 30,
									left: 0,
									bottom: 0
								}}
							>
								<defs>
									<linearGradient id="colorSigned" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="period"
									axisLine={false}
									tickLine={false}
									tick={{
										fontSize: 12,
										fill: "#64748b",
										fontFamily: "Inter"
									}}
									tickFormatter={formatXAxisLabel}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{
										fontSize: 12,
										fill: "#64748b",
										fontFamily: "Inter"
									}}
									allowDecimals={false}
								/>
								<Tooltip
									content={({ active, payload, label }) => {
										if (active && payload?.length && label) {
											const dataPoint = payload[0] as { value?: unknown }
											const value =
												typeof dataPoint?.value === "number"
													? dataPoint.value
													: 0
											return (
												<div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
													<p className="font-['Inter'] text-sm font-medium text-slate-900">
														{formatTooltipLabel(String(label))}
													</p>
													<p className="font-['Inter'] text-sm text-slate-600">
														<span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
														{value} document{value !== 1 ? "s" : ""} signed
													</p>
												</div>
											)
										}
										return null
									}}
								/>
								<Area
									type="monotone"
									dataKey="signed"
									stroke="#3b82f6"
									strokeWidth={2}
									fill="url(#colorSigned)"
									dot={{
										fill: "#3b82f6",
										strokeWidth: 2,
										r: 4
									}}
									activeDot={{
										r: 6,
										fill: "#3b82f6",
										strokeWidth: 2,
										stroke: "#ffffff"
									}}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				) : (
					<div className="flex h-[280px] items-center justify-center">
						<div className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
								<span className="text-2xl">📊</span>
							</div>
							<p className="font-['Inter'] text-sm font-medium text-slate-900">
								No signing activity
							</p>
							<p className="font-['Inter'] text-xs text-slate-600">
								Your signing activity will appear here once you start signing
								documents
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
