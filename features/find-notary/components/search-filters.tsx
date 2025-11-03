"use client"

import { Search } from "lucide-react"

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import type { SearchFilters, WorkflowType } from "../types/find-notary.types"

interface SearchFiltersProps {
	filters: SearchFilters
	onFiltersChange: (filters: SearchFilters) => void
}

export function SearchFiltersComponent({ filters, onFiltersChange }: SearchFiltersProps) {
	const updateFilter = (key: keyof SearchFilters, value: string) => {
		onFiltersChange({
			...filters,
			[key]: value,
		})
	}

	return (
		<Card className="mb-8">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Search className="h-5 w-5" />
					Search & Filter
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					{/* Search Input */}
					<div className="lg:col-span-2">
						<Input
							placeholder="Search by name, specialization, or location..."
							value={filters.searchTerm}
							onChange={e => updateFilter("searchTerm", e.target.value)}
							className="w-full"
						/>
					</div>

					{/* Location Filter */}
					<Select 
						value={filters.selectedLocation} 
						onValueChange={value => updateFilter("selectedLocation", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="All Locations" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Locations</SelectItem>
							<SelectItem value="Metro Manila">Metro Manila</SelectItem>
							<SelectItem value="Cebu">Cebu</SelectItem>
							<SelectItem value="Davao">Davao</SelectItem>
							<SelectItem value="Iloilo">Iloilo</SelectItem>
						</SelectContent>
					</Select>

					{/* Specialization Filter */}
					<Select 
						value={filters.selectedSpecialization} 
						onValueChange={value => updateFilter("selectedSpecialization", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="All Specializations" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Specializations</SelectItem>
							<SelectItem value="Real Estate">Real Estate</SelectItem>
							<SelectItem value="Business">Business Documents</SelectItem>
							<SelectItem value="Legal">Legal Documents</SelectItem>
							<SelectItem value="Immigration">Immigration</SelectItem>
							<SelectItem value="Corporate">Corporate</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Workflow Filter */}
				<div className="mt-4">
					<Tabs
						value={filters.selectedWorkflow}
						onValueChange={value => updateFilter("selectedWorkflow", value as WorkflowType | "ALL")}
					>
						<TabsList>
							<TabsTrigger value="ALL">All Workflows</TabsTrigger>
							<TabsTrigger value="REN">Remote (REN)</TabsTrigger>
							<TabsTrigger value="IEN">In-Person (IEN)</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</CardContent>
		</Card>
	)
}