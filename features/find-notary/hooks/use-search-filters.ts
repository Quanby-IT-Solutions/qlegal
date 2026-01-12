"use client"

import { useState } from "react"

import type { SearchFilters } from "../types/find-notary.types"

export function useSearchFilters() {
	const [filters, setFilters] = useState<SearchFilters>({
		searchTerm: "",
		selectedLocation: "ALL",
		selectedSpecialization: "ALL",
	})

	const updateFilters = (newFilters: SearchFilters) => {
		setFilters(newFilters)
	}

	const clearFilters = () => {
		setFilters({
			searchTerm: "",
			selectedLocation: "ALL",
			selectedSpecialization: "ALL",
		})
	}

	return {
		filters,
		updateFilters,
		clearFilters,
	}
}
