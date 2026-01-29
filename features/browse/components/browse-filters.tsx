"use client"

import { ArrowUpDown, Filter, Search, Star, X } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

interface EnpFiltersProps {
	searchTerm: string
	setSearchTerm: (value: string) => void
	specializationFilter: string
	setSpecializationFilter: (value: string) => void
	minRating: number
	setMinRating: (value: number) => void
	sortBy: string
	setSortBy: (value: string) => void
	onClearFilters: () => void
	totalResults: number
	filteredResults: number
}

const SPECIALIZATION_OPTIONS = [
	"All",
	"Legal Documents",
	"Contracts",
	"Real Estate",
	"Affidavits",
	"Business Law",
	"General",
]

const RATING_OPTIONS = [
	{ value: 0, label: "All Ratings" },
	{ value: 3, label: "3+ Stars" },
	{ value: 4, label: "4+ Stars" },
	{ value: 4.5, label: "4.5+ Stars" },
	{ value: 4.8, label: "4.8+ Stars" },
]

const SORT_OPTIONS = [
	{ value: "RATING", label: "Highest Rated" },
	{ value: "EXPERIENCE", label: "Most Experienced" },
	{ value: "RECENT", label: "Recently Added" },
	{ value: "AVAILABILITY", label: "Most Available" },
]

export function BrowseFilters({
	searchTerm,
	setSearchTerm,
	specializationFilter,
	setSpecializationFilter,
	minRating,
	setMinRating,
	sortBy,
	setSortBy,
	onClearFilters,
	totalResults,
	filteredResults,
}: EnpFiltersProps) {
	const hasActiveFilters = searchTerm || specializationFilter !== "all" || minRating > 0

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Filter className="size-5" />
						Filter Lawyers
					</CardTitle>
					{hasActiveFilters && (
						<Button variant="ghost" size="sm" onClick={onClearFilters}>
							<X className="mr-2 size-4" />
							Clear Filters
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4 md:flex-row">
					{/* Search Input */}
					<div className="flex-1">
						<div className="relative">
							<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								placeholder="Search by name or specialization..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="pr-10 pl-10"
							/>
							{searchTerm && (
								<button
									type="button"
									onClick={() => setSearchTerm("")}
									className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
									aria-label="Clear search"
								>
									<X className="size-4" />
								</button>
							)}
						</div>
					</div>

					{/* Specialization Filter */}
					<Select value={specializationFilter} onValueChange={setSpecializationFilter}>
						<SelectTrigger className="w-full md:w-48">
							<Filter className="mr-2 size-4" />
							<SelectValue placeholder="Specialization" />
						</SelectTrigger>
						<SelectContent>
							{SPECIALIZATION_OPTIONS.map(spec => (
								<SelectItem key={spec} value={spec.toLowerCase()}>
									{spec}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Rating Filter */}
					<Select
						value={minRating.toString()}
						onValueChange={v => setMinRating(Number.parseFloat(v))}
					>
						<SelectTrigger className="w-full md:w-44">
							<Star className="mr-2 size-4 fill-current" />
							<SelectValue placeholder="Rating" />
						</SelectTrigger>
						<SelectContent>
							{RATING_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value.toString()}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Sort By */}
					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full md:w-48">
							<ArrowUpDown className="mr-2 size-4" />
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Results Count */}
				<div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
					{filteredResults === totalResults ? (
						<span>
							Showing {filteredResults} lawyer{filteredResults !== 1 ? "s" : ""}
						</span>
					) : (
						<span>
							Showing {filteredResults} of {totalResults} lawyer{totalResults !== 1 ? "s" : ""}
						</span>
					)}
					{hasActiveFilters && <span className="text-xs">(filters applied)</span>}
				</div>
			</CardContent>
		</Card>
	)
}
