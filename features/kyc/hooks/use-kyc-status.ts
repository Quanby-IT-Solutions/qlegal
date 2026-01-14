/**
 * TanStack Query hook for checking KYC verification status
 * 
 * Option 1.5: "Smart Single Check"
 * - Check ONCE on mount (reads DB first, then calls HyperVerge if PENDING)
 * - NO automatic polling
 * - Relies on webhook for real-time updates (primary method)
 * - Manual "Check Status" button as fallback
 * 
 * API Call Count:
 * - Best case: 0 (webhook updated DB already)
 * - Worst case: 2 (1 auto check + 1 manual check)
 */

import { useQuery } from "@tanstack/react-query"
import { checkUserKycStatus } from "../api/kyc.actions"

interface UseKycStatusOptions {
	/**
	 * Enable the query (default: true)
	 */
	enabled?: boolean
	/**
	 * Current KYC status - used to determine if polling should continue
	 */
	currentStatus?: string | null
	/**
	 * Polling interval in milliseconds (default: 30000 = 30 seconds)
	 * Only polls when status is PENDING
	 */
	pollingInterval?: number
}

export function useKycStatus({
	enabled = true,
	currentStatus,
	pollingInterval = 30000, // Default: 30 seconds
}: UseKycStatusOptions = {}) {
	const isPending = currentStatus === "PENDING"

	return useQuery({
		queryKey: ["kyc-status"],
		queryFn: async () => {
			console.log("🔵 [TanStack Query] Checking KYC status")
			return checkUserKycStatus()
		},
		// Only refetch when status is PENDING
		refetchInterval: isPending ? pollingInterval : false,
		// Reduce aggressive refetching
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: "always", // Always check on mount (but deduped if already fetching)
		// Cache configuration
		staleTime: isPending ? 5000 : Infinity, // 5 seconds stale time when pending
		gcTime: 1000 * 60 * 5, // Cache for 5 minutes
		retry: 1,
		retryDelay: 3000,
	})
}
