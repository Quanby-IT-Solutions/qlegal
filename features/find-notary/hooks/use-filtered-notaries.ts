"use client"

import type { EnhancedENP, SearchFilters } from "../types/find-notary.types"

export function useFilteredNotaries(enps: EnhancedENP[] | undefined, filters: SearchFilters) {
	if (!enps) return []

	return enps.filter(enp => {
		const matchesSearch =
			enp.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
			enp.specialization.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
			enp.location.toLowerCase().includes(filters.searchTerm.toLowerCase())

		const matchesLocation = 
			filters.selectedLocation === "ALL" || 
			enp.location.includes(filters.selectedLocation)
		
		const matchesSpecialization =
			filters.selectedSpecialization === "ALL" || 
			enp.specialization.includes(filters.selectedSpecialization)
		
		// All ENPs support both REN and IEN
		const matchesWorkflow = filters.selectedWorkflow === "ALL"

		return matchesSearch && matchesLocation && matchesSpecialization && matchesWorkflow
	})
}