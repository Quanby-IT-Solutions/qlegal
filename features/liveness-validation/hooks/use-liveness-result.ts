/**
 * TanStack Query hook for fetching liveness verification results
 *
 * This hook prevents duplicate API calls through:
 * 1. Automatic request deduplication
 * 2. Proper caching with stale time
 * 3. Controlled refetching behavior
 *
 * Following HyperVerge best practices: Call /v1/output only ONCE per transaction
 */

import { useQuery } from "@tanstack/react-query"

import { getHostedLivenessResult } from "../api/liveness.actions"

interface UseLivenessResultOptions {
	transactionId: string | null
	enabled?: boolean
}

export function useLivenessResult({ transactionId, enabled = true }: UseLivenessResultOptions) {
	return useQuery({
		queryKey: ["liveness-result", transactionId],
		queryFn: async () => {
			if (!transactionId) {
				throw new Error("Transaction ID is required")
			}
			console.log("🔵 [TanStack Query] Fetching liveness result for:", transactionId)
			return getHostedLivenessResult(transactionId)
		},
		enabled: enabled && !!transactionId,
		// Prevent refetching - we only need the result once per transaction
		staleTime: Infinity, // Data never becomes stale
		gcTime: 1000 * 60 * 10, // Cache for 10 minutes (renamed from cacheTime in v5)
		retry: 1, // Only retry once on failure
		retryDelay: 2000, // Wait 2 seconds before retry
		refetchOnWindowFocus: false, // Don't refetch when window regains focus
		refetchOnReconnect: false, // Don't refetch on network reconnect
		refetchOnMount: false, // Don't refetch on component mount if data exists
	})
}
