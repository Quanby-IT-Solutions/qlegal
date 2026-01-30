"use client"

import { Search } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

import type { RequestFilters, RequestStats } from "../types/requests.types"

interface RequestFiltersProps {
	filters: RequestFilters
	onFiltersChange: (filters: Partial<RequestFilters>) => void
	stats: RequestStats
	showWorkflowFilter?: boolean
}

export function RequestFiltersComponent({
	filters,
	onFiltersChange,
	stats,
	showWorkflowFilter = false,
}: RequestFiltersProps) {
	return (
		<Card className="mb-6">
			<CardContent className="pt-6">
				<div
					className={`grid grid-cols-1 gap-4 ${showWorkflowFilter ? "md:grid-cols-4" : "md:grid-cols-3"}`}
				>
					{/* Search */}
					<div className="relative">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
						<Input
							placeholder="Search requests..."
							value={filters.search}
							onChange={e => onFiltersChange({ search: e.target.value })}
							className="pl-9"
						/>
					</div>

					{/* Status Filter */}
					<Select
						value={filters.status}
						onValueChange={value => onFiltersChange({ status: value as RequestFilters["status"] })}
					>
						<SelectTrigger>
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">
								All Status
								<Badge variant="secondary" className="ml-2">
									{stats.total}
								</Badge>
							</SelectItem>
							<SelectItem value="PENDING">
								Pending
								<Badge variant="secondary" className="ml-2">
									{stats.pending}
								</Badge>
							</SelectItem>
							<SelectItem value="CONFIRMED">
								Confirmed
								<Badge variant="secondary" className="ml-2">
									{stats.confirmed}
								</Badge>
							</SelectItem>
							<SelectItem value="COMPLETED">
								Completed
								<Badge variant="secondary" className="ml-2">
									{stats.completed}
								</Badge>
							</SelectItem>
							<SelectItem value="CANCELLED">
								Cancelled
								<Badge variant="secondary" className="ml-2">
									{stats.cancelled}
								</Badge>
							</SelectItem>
						</SelectContent>
					</Select>

					{/* Type Filter */}
					<Select
						value={filters.type}
						onValueChange={value => onFiltersChange({ type: value as RequestFilters["type"] })}
					>
						<SelectTrigger>
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Types</SelectItem>
							<SelectItem value="CONSULTATION">Consultation</SelectItem>
							<SelectItem value="DOCUMENT_SIGNING">Document Signing</SelectItem>
						</SelectContent>
					</Select>

					{/* Workflow Filter (optional) */}
					{showWorkflowFilter && (
						<Select
							value={filters.workflow}
							onValueChange={value =>
								onFiltersChange({ workflow: value as RequestFilters["workflow"] })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="All Workflows" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Workflows</SelectItem>
								<SelectItem value="REN">REN (Remote)</SelectItem>
								<SelectItem value="IEN">IEN (In-Person)</SelectItem>
							</SelectContent>
						</Select>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
