"use client"

import { useMemo, useState } from "react"
import { LayoutGrid, List, Search, UserCheck } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"

import { trpc } from "@/services/trpc/client"

import { LawyerCard } from "./lawyer-card"

type ViewMode = "grid" | "list"

export function LawyersPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [viewMode, setViewMode] = useState<ViewMode>("grid")

	const { data: lawyers, isPending } = trpc.lawyers.getLawyers.useQuery({
		query: searchQuery,
		limit: 50,
	})

	const { data: lawyersCount } = trpc.lawyers.getLawyersCount.useQuery()

	// Filter lawyers based on search
	const filteredLawyers = useMemo(() => {
		if (!lawyers) return []
		return lawyers
	}, [lawyers])

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background dark:bg-muted/60 border-b backdrop-blur">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-start gap-4">
						<div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
							<UserCheck className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<h1 className="text-foreground text-2xl font-medium">Find a Lawyer</h1>
							<p className="text-muted-foreground mt-1 text-sm">
								Connect with verified Electronic Notary Public (ENP) professionals
							</p>
						</div>
					</div>

					{/* Controls */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-1 items-center gap-4">
							{/* Search */}
							<div className="relative max-w-sm flex-1">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<Input
									placeholder="Search lawyers by name, email..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>

						<div className="flex items-center gap-4">
							{/* View Mode Toggle */}
							<ToggleGroup
								type="single"
								value={viewMode}
								onValueChange={(value: ViewMode) => value && setViewMode(value)}
							>
								<ToggleGroupItem value="grid" aria-label="Grid view">
									<LayoutGrid className="h-4 w-4" />
								</ToggleGroupItem>
								<ToggleGroupItem value="list" aria-label="List view">
									<List className="h-4 w-4" />
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</div>
				</div>
			</div>

			{/* Lawyers List */}
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Loading State */}
				{isPending && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="space-y-4 rounded-lg border p-6">
								<div className="flex items-start gap-4">
									<Skeleton className="h-16 w-16 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-5 w-32" />
										<Skeleton className="h-4 w-24" />
									</div>
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-3/4" />
								</div>
								<div className="flex gap-2">
									<Skeleton className="h-10 flex-1" />
									<Skeleton className="h-10 flex-1" />
								</div>
							</div>
						))}
					</div>
				)}

				{/* Empty State */}
				{!isPending && filteredLawyers.length === 0 && (
					<div className="py-12 text-center">
						<div className="space-y-3">
							<div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
								<UserCheck className="text-muted-foreground h-8 w-8" />
							</div>
							<div className="text-foreground text-lg font-medium">No lawyers found</div>
							<p className="text-muted-foreground mx-auto max-w-md text-sm">
								{searchQuery
									? "Try adjusting your search criteria."
									: "No Electronic Notary Public professionals are currently available."}
							</p>
							{searchQuery && (
								<Button variant="outline" onClick={() => setSearchQuery("")}>
									Clear search
								</Button>
							)}
						</div>
					</div>
				)}

				{/* Grid View */}
				{!isPending && viewMode === "grid" && filteredLawyers.length > 0 && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredLawyers.map(lawyer => (
							<LawyerCard key={lawyer.id} lawyer={lawyer} />
						))}
					</div>
				)}

				{/* List View */}
				{!isPending && viewMode === "list" && filteredLawyers.length > 0 && (
					<div className="space-y-4">
						{filteredLawyers.map(lawyer => (
							<LawyerCard key={lawyer.id} lawyer={lawyer} />
						))}
					</div>
				)}
			</div>

			{/* Results count */}
			<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				{!isPending && (
					<div className="text-muted-foreground text-sm">
						{filteredLawyers.length} of {lawyersCount ?? 0} lawyers
						{searchQuery && ` (matching "${searchQuery}")`}
					</div>
				)}
			</div>
		</div>
	)
}
