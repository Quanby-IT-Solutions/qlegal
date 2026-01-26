"use client"

import { AlertCircle } from "lucide-react"

import { EnpCard } from "@/core/components/enp-card"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"

interface ENP {
	id: string
	name: string
	initials: string
	rating: number
	reviewCount: number
	badges: string[]
	specializations: string[]
	location: string
	rate: number
	experience?: string
	languages?: string[] | string
	responseTime?: string
	isAvailable?: boolean
}

interface ENPsData {
	total: number
	enps: ENP[]
}

export function BrowseENPsTab() {
	const enpsQuery = trpc.quickMatch.getAvailableENPs.useQuery({
		specialization: undefined,
		minRating: undefined,
		sortBy: "RATING",
		date: undefined,
		limit: 20,
		offset: 0,
	}) as { data: ENPsData | undefined; isLoading: boolean }

	const enpsData = enpsQuery.data
	const isLoading = enpsQuery.isLoading

	return (
		<div className="space-y-6">
			{isLoading ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i} className="overflow-hidden">
							<CardContent className="pt-6">
								<Skeleton className="mb-4 size-12 rounded-full" />
								<Skeleton className="mb-2 h-4 w-3/4" />
								<Skeleton className="mb-2 h-4 w-1/2" />
								<Skeleton className="h-3 w-2/3" />
							</CardContent>
						</Card>
					))}
				</div>
			) : enpsData && enpsData.enps.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{enpsData.enps.map((enp: ENP) => (
						<EnpCard
							key={enp.id}
							variant="browse"
							enp={{
								id: enp.id,
								name: enp.name,
								email: null,
								image: null,
								phoneNumber: null,
								specialization: enp.specializations?.[0] ?? "General",
								rating: enp.rating,
								reviewCount: enp.reviewCount,
								languages: enp.languages ?? [],
								experience: enp.experience,
								responseTime: enp.responseTime,
								isAvailable: enp.isAvailable ?? true,
								location: enp.location,
								rate: enp.rate,
								badges: enp.badges,
							}}
							hoverEffect
						/>
					))}
				</div>
			) : (
				<Alert>
					<AlertCircle className="size-4" />
					<AlertTitle>No notaries found</AlertTitle>
					<AlertDescription>
						No notaries are currently available. Please check back later.
					</AlertDescription>
				</Alert>
			)}
		</div>
	)
}
