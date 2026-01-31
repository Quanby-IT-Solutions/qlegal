"use client"

import { skipToken } from "@tanstack/react-query"

import { trpc } from "@/services/trpc/client"

import { CACHE_TIMES } from "../lib/browse.constants"

export function useBrowse() {
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
		trpc.browse.getAvailableENPs.useQuery(input ?? skipToken, {
			staleTime: CACHE_TIMES.ENPS,
		})

	// Find best match for Quick Match
	const findBestMatch = (input: {
		serviceType: "CONSULTATION" | "NOTARIZATION"
		sessionMode: "REN" | "IEN"
	}) =>
		trpc.browse.findBestMatch.useQuery(input, {
			staleTime: CACHE_TIMES.ENPS,
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
			staleTime: CACHE_TIMES.PRINCIPAL_SCORE,
		})

	return {
		getAvailableENPs,
		findBestMatch,
		trackQuickMatchResponse,
		getPrincipalScore,
	}
}
