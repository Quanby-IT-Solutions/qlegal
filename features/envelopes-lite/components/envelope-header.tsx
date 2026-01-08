"use client"

import { Grid3X3, List, Plus, Search } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"

interface EnvelopeHeaderProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	selectedStatus: string
	onStatusChange: (value: string) => void
	viewMode: "grid" | "list"
	onViewModeChange: (mode: "grid" | "list") => void
	onCreateClick: () => void
	isCreating: boolean
}

export function EnvelopeHeader({
	searchQuery,
	onSearchChange,
	selectedStatus,
	onStatusChange,
	viewMode,
	onViewModeChange,
	onCreateClick,
	isCreating,
}: EnvelopeHeaderProps) {
	return (
		<div className="bg-background border-b">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Vercel-style Page Title */}
				<div className="mb-6">
					<h1 className="text-foreground text-2xl font-medium">Envelopes</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Manage your digital signature envelopes
					</p>
				</div>

				{/* True Vercel Controls */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-1 items-center gap-3">
						{/* Vercel Search */}
						<div className="relative max-w-sm flex-1">
							<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
							<Input
								placeholder="Search..."
								value={searchQuery}
								onChange={e => onSearchChange(e.target.value)}
								className="border-border bg-background h-8 border pl-10 text-sm focus-visible:ring-1"
							/>
						</div>

						{/* Vercel Filter */}
						<select
							value={selectedStatus}
							onChange={e => onStatusChange(e.target.value)}
							className="border-border bg-background focus:ring-ring h-8 rounded-md border px-3 text-sm focus:ring-1 focus:outline-none"
						>
							<option value="all">All Status</option>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
							<option value="completed">Completed</option>
						</select>

						{/* Vercel View Toggle */}
						<div className="border-border bg-background flex items-center rounded-md border">
							<Button
								variant={viewMode === "grid" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => onViewModeChange("grid")}
								className="h-7 rounded-r-none border-r px-2"
							>
								<Grid3X3 className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant={viewMode === "list" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => onViewModeChange("list")}
								className="h-7 rounded-l-none px-2"
							>
								<List className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>

					{/* Vercel Create Button */}
					<Button
						onClick={onCreateClick}
						disabled={isCreating}
						size="sm"
						className="h-8 px-3 text-sm"
					>
						{isCreating ? (
							<div className="flex items-center gap-2">
								<div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"></div>
								<span>Creating...</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Plus className="h-4 w-4" />
								<span>Create</span>
							</div>
						)}
					</Button>
				</div>
			</div>
		</div>
	)
}
