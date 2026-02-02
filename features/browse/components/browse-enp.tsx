"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useBrowse } from "../api/browse.hooks"
import { BrowseFilters } from "./browse-filters"
import { EnpCard } from "./enp-card"

export function BrowseENP() {
	type FilterState = {
		searchTerm: string
		specialization: string
		minRating: number
		sortBy: "RATING" | "EXPERIENCE" | "RECENT" | "AVAILABILITY"
	}

	const [filters, setFilters] = useState<FilterState>({
		searchTerm: "",
		specialization: "all",
		minRating: 0,
		sortBy: "RATING",
	})

	// Use custom hook for ENP data
	const { getAvailableENPs } = useBrowse()
	const enpsQuery = getAvailableENPs({
		specialization: filters.specialization === "all" ? undefined : filters.specialization,
		minRating: filters.minRating > 0 ? filters.minRating : undefined,
		sortBy: filters.sortBy,
		date: undefined,
		limit: 20,
		offset: 0,
		// Pass search term to server for server-side filtering
		searchTerm: filters.searchTerm || undefined,
	})

	const enpsData = enpsQuery.data
	const isLoading = enpsQuery.isLoading
	const enps = enpsData?.enps ?? []

	// Filter state update helper
	const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
		setFilters(prev => ({ ...prev, [key]: value }))

	const handleClearFilters = () => {
		updateFilter("specialization", "all")
		updateFilter("minRating", 0)
		updateFilter("sortBy", "RATING")
		updateFilter("searchTerm", "")
	}

	return (
		<div className="space-y-6">
			<BrowseFilters
				searchTerm={filters.searchTerm}
				setSearchTerm={value => setFilters(prev => ({ ...prev, searchTerm: value }))}
				specializationFilter={filters.specialization}
				setSpecializationFilter={value => setFilters(prev => ({ ...prev, specialization: value }))}
				minRating={filters.minRating}
				setMinRating={value => setFilters(prev => ({ ...prev, minRating: value }))}
				sortBy={filters.sortBy}
				setSortBy={value => setFilters(prev => ({ ...prev, sortBy: value }))}
				onClearFilters={handleClearFilters}
				totalResults={enpsData?.total ?? 0}
				filteredResults={enps.length}
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
			) : enps.length > 0 ? (
				<div className="flex flex-wrap items-center justify-center gap-6 md:justify-start">
					{enps.map(enp => (
						<EnpCard key={enp.id} enp={enp} />
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
