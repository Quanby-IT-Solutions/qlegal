"use client"

import { useEffect, useState } from "react"

import { type RouterOutputs } from "@/services/trpc/client"

type DashboardStatistics = RouterOutputs["dashboard"]["getStatistics"]

export function usePendingRequestsDot(params: {
	isENP: boolean
	statistics: DashboardStatistics | undefined
	pathname: string | null
}): {
	hasViewedRequests: boolean
	markAsViewed: () => void
} {
	const { isENP, statistics, pathname } = params
	const [hasViewedRequests, setHasViewedRequests] = useState(false)

	useEffect(() => {
		if (isENP && statistics) {
			const viewed = localStorage.getItem("enp_viewed_requests")
			const lastViewedCount = localStorage.getItem("enp_last_viewed_count")
			const currentCount = statistics.pendingNotarizationRequests ?? 0

			if (viewed === "true" && lastViewedCount) {
				const lastCount = parseInt(lastViewedCount, 10)
				if (currentCount > lastCount) {
					setHasViewedRequests(false)
				} else if (currentCount === 0) {
					setHasViewedRequests(true)
				} else {
					setHasViewedRequests(true)
				}
			} else {
				setHasViewedRequests(currentCount === 0)
			}
		}
	}, [isENP, statistics])

	useEffect(() => {
		if (isENP && (pathname === "/requests" || pathname === "/requests/incoming")) {
			const currentCount = statistics?.pendingNotarizationRequests ?? 0
			localStorage.setItem("enp_viewed_requests", "true")
			localStorage.setItem("enp_last_viewed_count", currentCount.toString())
			setHasViewedRequests(true)
		}
	}, [isENP, pathname, statistics?.pendingNotarizationRequests])

	function markAsViewed() {
		const currentCount = statistics?.pendingNotarizationRequests ?? 0
		localStorage.setItem("enp_viewed_requests", "true")
		localStorage.setItem("enp_last_viewed_count", currentCount.toString())
		setHasViewedRequests(true)
	}

	return { hasViewedRequests, markAsViewed }
}
