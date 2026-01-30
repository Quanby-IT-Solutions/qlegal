import { useCallback, useState } from "react"

import type { RequestFilters } from "../types/requests.types"

export function useRequestFilters() {
	const [filters, setFilters] = useState<RequestFilters>({
		search: "",
		status: "ALL",
		type: "ALL",
		workflow: "ALL",
	})

	const updateFilters = useCallback((updates: Partial<RequestFilters>) => {
		setFilters(prev => ({ ...prev, ...updates }))
	}, [])

	const clearFilters = useCallback(() => {
		setFilters({
			search: "",
			status: "ALL",
			type: "ALL",
			workflow: "ALL",
		})
	}, [])

	return {
		filters,
		updateFilters,
		clearFilters,
	}
}
