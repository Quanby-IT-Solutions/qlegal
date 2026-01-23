"use client"

import { useState } from "react"
import { format } from "date-fns"
import { AlertCircle, Filter, X } from "lucide-react"

import { EnpCard } from "@/core/components/enp-card"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
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
	const [specialization, setSpecialization] = useState<string>("all")
	const [minRating, setMinRating] = useState<number | undefined>()
	const [sortBy, setSortBy] = useState<"RATING" | "EXPERIENCE" | "RECENT" | "AVAILABILITY">(
		"RATING"
	)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>()

	const enpsQuery = trpc.quickMatch.getAvailableENPs.useQuery({
		specialization: specialization ?? undefined,
		minRating: minRating ?? undefined,
		sortBy,
		date: selectedDate,
		limit: 20,
		offset: 0,
	}) as { data: ENPsData | undefined; isLoading: boolean }

	const enpsData = enpsQuery.data
	const isLoading = enpsQuery.isLoading
	const selectedDateLabel = selectedDate ? format(selectedDate, "EEEE, MMM d") : null
	const totalLabel = enpsData?.total ?? 0

	return (
		<div className="space-y-6">
			{/* Filters Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Filter className="text-muted-foreground size-5" />
						<CardTitle>Find Your Notary</CardTitle>
					</div>
					<CardDescription>
						{enpsData ? `${totalLabel} notaries available` : "Loading..."}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<Label className="text-base font-semibold">Refine your search</Label>
						<p className="text-muted-foreground mb-3 text-sm">
							Filter by specialization, rating, and sorting preference
						</p>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="specialization" className="text-sm">
									Specialization
								</Label>
								<Select value={specialization} onValueChange={setSpecialization}>
									<SelectTrigger id="specialization">
										<SelectValue placeholder="All specializations" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Specializations</SelectItem>
										<SelectItem value="real-estate">Real Estate</SelectItem>
										<SelectItem value="business">Business Contracts</SelectItem>
										<SelectItem value="family">Family Law</SelectItem>
										<SelectItem value="corporate">Corporate</SelectItem>
										<SelectItem value="international">International</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="min-rating" className="text-sm">
									Minimum Rating
								</Label>
								<Select
									value={minRating?.toString() ?? "all"}
									onValueChange={value =>
										setMinRating(
											value === "all" ? undefined : value ? parseFloat(value) : undefined
										)
									}
								>
									<SelectTrigger id="min-rating">
										<SelectValue placeholder="All ratings" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Any Rating</SelectItem>
										<SelectItem value="4.5">4.5+ Stars</SelectItem>
										<SelectItem value="4.0">4.0+ Stars</SelectItem>
										<SelectItem value="3.5">3.5+ Stars</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="sort" className="text-sm">
									Sort By
								</Label>
								<Select
									value={sortBy}
									onValueChange={value =>
										setSortBy(value as "RATING" | "EXPERIENCE" | "RECENT" | "AVAILABILITY")
									}
								>
									<SelectTrigger id="sort">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="RATING">Highest Rated</SelectItem>
										<SelectItem value="EXPERIENCE">Most Experienced</SelectItem>
										<SelectItem value="RECENT">Recently Active</SelectItem>
										<SelectItem value="AVAILABILITY">Most Available</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Calendar & Results Section */}
			<div className="grid gap-6 lg:grid-cols-[420px,1fr]">
				{/* Calendar Picker */}
				<Card>
					<CardHeader>
						<CardTitle>Choose Appointment Date</CardTitle>
						<CardDescription>
							{selectedDateLabel
								? `Showing notaries available on ${selectedDateLabel}`
								: "Select a date to check availability"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={setSelectedDate}
							disabled={date => date < new Date()}
							initialFocus
							className="bg-muted/30 w-full max-w-[380px] rounded-2xl border p-4 shadow-sm [--cell-size:2.6rem]"
						/>

						{selectedDate && (
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => setSelectedDate(undefined)}
							>
								<X className="mr-2 size-4" />
								Clear Date
							</Button>
						)}
					</CardContent>
				</Card>

				{/* Results Section */}
				<div className="space-y-4">
					<Card className="border-none shadow-none">
						<CardHeader className="px-0 pt-0">
							<div className="flex items-center justify-between">
								<CardTitle>Available Notaries</CardTitle>
								{enpsData && (
									<Badge variant="secondary" className="text-sm">
										{totalLabel} found
									</Badge>
								)}
							</div>
							<CardDescription>
								{selectedDateLabel
									? "Showing notaries available on your selected date"
									: "Browse all available notaries"}
							</CardDescription>
						</CardHeader>
					</Card>

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
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
								Try adjusting your filters or selecting a different date to see more options.
							</AlertDescription>
						</Alert>
					)}
				</div>
			</div>
		</div>
	)
}
