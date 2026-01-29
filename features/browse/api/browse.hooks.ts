"use client"

import { trpc } from "@/services/trpc/client"

export function useBrowse() {
	const utils = trpc.useUtils()

	// Get available ENPs with filters
	const getAvailableENPs = (input?: {
		sessionMode?: "REN" | "IEN" | undefined
		serviceType?: "CONSULTATION" | "NOTARIZATION" | undefined
		specialization?: string | undefined
		minRating?: number | undefined
		date?: Date | undefined
		searchTerm?: string | undefined
		sortBy?: "RATING" | "EXPERIENCE" | "RECENT" | "AVAILABILITY" | undefined
		limit?: number | undefined
		offset?: number | undefined
	}) =>
		trpc.browse.getAvailableENPs.useQuery(input, {
			staleTime: 60_000, // Cache for 1 minute
		})

	// Find best match for Quick Match
	const findBestMatch = trpc.browse.findBestMatch.useMutation({
		onSuccess: () => {
			// Invalidate ENPs cache to ensure fresh data
			void utils.browse.getAvailableENPs.invalidate()
		},
	})

	// Track Quick Match response
	const trackQuickMatchResponse = trpc.browse.trackQuickMatchResponse.useMutation({
		onSuccess: () => {
			// Invalidate relevant caches if needed
		},
	})

	// Get principal score
	const getPrincipalScore = () =>
		trpc.browse.getPrincipalScore.useQuery(undefined, {
			staleTime: 300_000, // Cache for 5 minutes
		})

	return {
		getAvailableENPs,
		findBestMatch,
		trackQuickMatchResponse,
		getPrincipalScore,
	}
}
