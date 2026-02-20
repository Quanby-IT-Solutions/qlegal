"use client"

import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { type IconSvgObject } from "@/core/lib/nav/types"

interface DashboardStatsCardsProps {
	statsCards: Array<{
		title: string
		value: number
		icon: IconSvgObject
		description: string
		color: string
		bgColor: string
	}>
	isLoading: boolean
	isENP: boolean
	pendingNotarizationRequests: number
	hasViewedRequests: boolean
}

export function DashboardStatsCards({
	statsCards,
	isLoading,
	isENP,
	pendingNotarizationRequests,
	hasViewedRequests,
}: DashboardStatsCardsProps) {
	return (
		<div className={`grid gap-4 sm:grid-cols-2 ${isENP ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
			{isLoading
				? Array.from({ length: isENP ? 5 : 4 }).map((_, i) => (
						<Card key={i}>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-4 rounded-full" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
								<Skeleton className="mt-2 h-3 w-32" />
							</CardContent>
						</Card>
					))
				: statsCards.map((stat, index) => {
						const hasPendingRequests =
							isENP &&
							stat.title === "Notarization Requests" &&
							pendingNotarizationRequests > 0 &&
							!hasViewedRequests
						return (
							<Card key={index} className="relative overflow-visible">
								{hasPendingRequests && (
									<div className="border-background absolute -top-2 -right-2 z-20 h-4 w-4 animate-pulse rounded-full border-2 bg-red-500 shadow-lg" />
								)}
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
									<HugeiconsIcon icon={stat.icon} size={16} className={stat.color} />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stat.value}</div>
									<p className="text-muted-foreground text-xs">{stat.description}</p>
								</CardContent>
							</Card>
						)
					})}
		</div>
	)
}
