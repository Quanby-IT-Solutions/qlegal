"use client"

import { useState } from "react"
import type { SearchFilters, WorkflowType } from "../types/find-notary.types"

export function useSearchFilters() {
	const [filters, setFilters] = useState<SearchFilters>({
		searchTerm: "",
		selectedLocation: "ALL",
		selectedSpecialization: "ALL",
		selectedWorkflow: "ALL",
	})

	const updateFilters = (newFilters: SearchFilters) => {
		setFilters(newFilters)
	}

	const clearFilters = () => {
		setFilters({
			searchTerm: "",
			selectedLocation: "ALL",
			selectedSpecialization: "ALL",
			selectedWorkflow: "ALL",
		})
	}

	return {
		filters,
		updateFilters,
		clearFilters,
	}
}