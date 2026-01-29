"use client"

import { useMemo, useState } from "react"
import { AlertCircle } from "lucide-react"

import { EnpCard } from "@/core/components/enp-card"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"

import { EnpFilters } from "../../quick-match/components/enp-filters"

export function BrowseENP() {
	const [filters, setFilters] = useState({
		searchTerm: "",
		specialization: "all",
		minRating: 0,
		sortBy: "RATING",
	})

	const enpsQuery = trpc.quickMatch.getAvailableENPs.useQuery({
		specialization: filters.specialization === "all" ? undefined : filters.specialization,
		minRating: filters.minRating > 0 ? filters.minRating : undefined,
		sortBy: filters.sortBy as "RATING" | "EXPERIENCE" | "RECENT" | "AVAILABILITY",
		date: undefined,
		limit: 20,
		offset: 0,
	})

	const enpsData = enpsQuery.data
	const isLoading = enpsQuery.isLoading

	const filteredENPs = useMemo(() => {
		if (!enpsData?.enps) return []

		if (!filters.searchTerm.trim()) {
			return enpsData.enps
		}

		const searchTerm = filters.searchTerm.toLowerCase()
		return enpsData.enps.filter(enp => {
			const nameMatch = enp.name.toLowerCase().includes(searchTerm)
			const specializationMatch = enp.specializations.some(spec =>
				spec.toLowerCase().includes(searchTerm)
			)
			const languages = Array.isArray(enp.languages) ? enp.languages : [enp.languages]
			const languagesMatch = languages.some(
				lang => typeof lang === "string" && lang.toLowerCase().includes(searchTerm)
			)

			return nameMatch || specializationMatch || languagesMatch
		})
	}, [enpsData?.enps, filters.searchTerm])

	const handleClearFilters = () => {
		setFilters({
			searchTerm: "",
			specialization: "all",
			minRating: 0,
			sortBy: "RATING",
		})
	}

	return (
		<div className="space-y-6">
			<EnpFilters
				searchTerm={filters.searchTerm}
				setSearchTerm={term => setFilters(prev => ({ ...prev, searchTerm: term }))}
				specializationFilter={filters.specialization}
				setSpecializationFilter={spec => setFilters(prev => ({ ...prev, specialization: spec }))}
				minRating={filters.minRating}
				setMinRating={rating => setFilters(prev => ({ ...prev, minRating: rating }))}
				sortBy={filters.sortBy}
				setSortBy={sort => setFilters(prev => ({ ...prev, sortBy: sort }))}
				onClearFilters={handleClearFilters}
				totalResults={enpsData?.enps.length ?? 0}
				filteredResults={filteredENPs.length}
			/>

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
			) : filteredENPs.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{filteredENPs.map(enp => (
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
						{filters.searchTerm || filters.specialization !== "all" || filters.minRating > 0
							? "No notaries match your current filters. Try adjusting your search criteria or clearing filters."
							: "No notaries are currently available. Please check back later."}
					</AlertDescription>
				</Alert>
			)}
		</div>
	)
}
