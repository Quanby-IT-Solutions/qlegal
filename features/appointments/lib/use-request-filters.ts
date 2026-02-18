import { useCallback, useState } from "react"

export interface RequestFilters {
	search: string
	status: "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
	type: "ALL" | "NOTARIZATION" | "CONSULTATION"
	workflow: "ALL" | "REN" | "IEN"
}

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
