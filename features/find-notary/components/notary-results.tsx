"use client"

import { Filter, Loader2, Search } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
} from "@/core/components/ui/card"
import { NotaryCard } from "./notary-card"
import type { EnhancedENP, WorkflowType } from "../types/find-notary.types"

interface NotaryResultsProps {
	notaries: EnhancedENP[]
	isLoading: boolean
	onBookConsultation: (enpId: string, workflow: WorkflowType) => void
	onClearFilters: () => void
}

export function NotaryResults({ 
	notaries, 
	isLoading, 
	onBookConsultation, 
	onClearFilters 
}: NotaryResultsProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (notaries.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
					<h3 className="mb-2 text-lg font-medium">No notaries found</h3>
					<p className="text-muted-foreground mb-4">
						Try adjusting your search criteria or filters to find more results.
					</p>
					<Button onClick={onClearFilters} variant="outline">
						Clear Filters
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					{notaries.length} Notary{notaries.length !== 1 ? "ies" : ""} Found
				</h2>
				<div className="flex items-center gap-2">
					<Filter className="h-4 w-4" />
					<span className="text-muted-foreground text-sm">Filtered by your criteria</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{notaries.map(enp => (
					<NotaryCard 
						key={enp.id} 
						enp={enp} 
						onBookConsultation={onBookConsultation} 
					/>
				))}
			</div>
		</div>
	)
}