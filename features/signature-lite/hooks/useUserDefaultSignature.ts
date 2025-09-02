"use client"

import { useSession } from "next-auth/react"

import { trpc } from "@/services/trpc/client"

/**
 * Custom hook to get the current user's default signature
 * This hook fetches the default signature directly from the database
 * and also provides session-based fallback
 */
export function useUserDefaultSignature() {
	const { data: session, status } = useSession()

	// Query the user's default signature directly from the database
	const {
		data: userSignature,
		isLoading,
		error
	} = trpc.userManagement.getDefaultSignature.useQuery(
		undefined, // No parameters needed as it uses session
		{
			enabled: status === "authenticated" && !!session?.user?.id,
			staleTime: 5 * 60 * 1000 // 5 minutes
		}
	)

	// Use only database query result (no session fallback)
	const defaultSignature = userSignature?.defaultSignature

	return {
		defaultSignature,
		isLoading: status === "loading" || isLoading,
		error,
		isAuthenticated: status === "authenticated",
		hasDefaultSignature: !!defaultSignature
	}
}
