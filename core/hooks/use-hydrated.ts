"use client"

import { useEffect, useState } from "react"

/**
 * Hook to safely handle hydration mismatches by ensuring component only renders after hydration
 * This prevents SSR/client mismatch errors with components that generate random IDs
 */
export function useHydrated() {
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		setHydrated(true)
	}, [])

	return hydrated
}
