"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { LayoutGrid, List, Search } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { EnvelopeCard } from "./envelope-card"
import { EnvelopeCreateDialog } from "./envelope-create-dialog"
import { EnvelopeEmptyState } from "./envelope-empty-state"
import { EnvelopeListItem } from "./envelope-list-item"
import { EnvelopeLoadingSkeleton } from "./envelope-loading-skeleton"

type ViewMode = "grid" | "list"
type StatusFilter =
	| "all"
	| "DRAFT"
	| "PUBLISHED"
	| "COMPLETED"
	| "PENDING_APPROVAL"
	| "APPROVED"
	| "REJECTED"

export function EnvelopesPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [viewMode, setViewMode] = useState<ViewMode>("grid")

	const { data: envelopes, isPending } = trpc.envelopeLite.getMyEnvelopes.useQuery()

	// Filter and search envelopes
	const filteredEnvelopes = useMemo(() => {
		if (!envelopes) {
			return []
		}

		return envelopes.filter(envelope => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase()
				return (
					envelope.title.toLowerCase().includes(query) ||
					(envelope.description?.toLowerCase().includes(query) ?? false) ||
					(envelope.user?.name?.toLowerCase().includes(query) ?? false) ||
					(envelope.user?.email?.toLowerCase().includes(query) ?? false)
				)
			}

			return true
		})
	}, [envelopes, searchQuery])

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background border-b">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div>
						<h1 className="text-foreground text-2xl font-medium">Envelopes</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							Manage your digital signature envelopes
						</p>
					</div>

					{/* Controls */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-1 items-center gap-4">
							{/* Search */}
							<div className="relative max-w-sm flex-1">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<Input
									placeholder="Search envelopes..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>

							{/* Status Filter */}
							{/* <Select
								value={statusFilter}
								onValueChange={(value: StatusFilter) => setStatusFilter(value)}
							>
								<SelectTrigger className="w-[180px]">
									<Filter className="mr-2 h-4 w-4" />
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="DRAFT">Draft</SelectItem>
									<SelectItem value="PUBLISHED">Published</SelectItem>
									<SelectItem value="COMPLETED">Completed</SelectItem>
									<SelectItem value="PENDING_APPROVAL">
										Pending Approval
									</SelectItem>
									<SelectItem value="APPROVED">Approved</SelectItem>
									<SelectItem value="REJECTED">Rejected</SelectItem>
								</SelectContent>
							</Select> */}
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

							{/* Create Button */}
							<EnvelopeCreateDialog />
						</div>
					</div>
				</div>
			</div>

			{/* Envelopes */}
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{isPending && <EnvelopeLoadingSkeleton viewMode={viewMode} />}

				{!isPending && filteredEnvelopes.length === 0 && (
					<div className="py-12 text-center">
						{envelopes?.length === 0 ? (
							<EnvelopeEmptyState />
						) : (
							<div className="space-y-3">
								<div className="text-muted-foreground text-lg font-medium">No envelopes found</div>
								<p className="text-muted-foreground mx-auto max-w-md text-sm">
									{searchQuery || statusFilter !== "all"
										? "Try adjusting your search or filter criteria."
										: "Create your first envelope to get started."}
								</p>
								{(searchQuery || statusFilter !== "all") && (
									<Button
										variant="outline"
										onClick={() => {
											setSearchQuery("")
											setStatusFilter("all")
										}}
									>
										Clear filters
									</Button>
								)}
							</div>
						)}
					</div>
				)}

				{/* Grid View */}
				{!isPending && viewMode === "grid" && filteredEnvelopes.length > 0 && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredEnvelopes.map(envelope => (
							<Link
								href={`/envelope/${envelope.id}`}
								key={envelope.id}
								className="ring-offset-background focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<EnvelopeCard envelope={envelope} />
							</Link>
						))}
					</div>
				)}

				{/* List View */}
				{!isPending && viewMode === "list" && filteredEnvelopes.length > 0 && (
					<div className="space-y-4">
						{filteredEnvelopes.map(envelope => (
							<Link
								href={`/envelope/${envelope.id}`}
								key={envelope.id}
								className="ring-offset-background focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<EnvelopeListItem envelope={envelope} />
							</Link>
						))}
					</div>
				)}
			</div>

			{/* Envelopes */}
			<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
				{/* Results count */}
				{!isPending && (
					<div className="text-muted-foreground text-sm">
						{filteredEnvelopes.length} of {envelopes?.length ?? 0} envelopes
						{statusFilter !== "all" && ` (filtered by ${statusFilter.toLowerCase()})`}
						{searchQuery && ` (matching "${searchQuery}")`}
					</div>
				)}
			</div>
		</div>
	)
}
