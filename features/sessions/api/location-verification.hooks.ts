"use client"

import { useCallback, useState } from "react"

import { trpc } from "@/services/trpc/client"

export interface VpnCheckResult {
	checked: boolean
	isVpn: boolean
	message?: string
	ipInfo?: {
		isp?: string
		org?: string
		country?: string
	} | null
}

export function useLocationVerification() {
	const verifyLocation = trpc.locationVerification.verifyLocation.useMutation()
	const saveUserLocation = trpc.locationVerification.saveUserLocation.useMutation()

	const checkVpn = trpc.locationVerification.checkVpn.useQuery(undefined, {
		retry: false,
		refetchOnWindowFocus: false,
	})

	return {
		verifyLocation,
		saveUserLocation,
		checkVpn,
	}
}

/**
 * Hook to perform a quick VPN check before full location verification
 * Useful for early VPN detection without requiring geolocation
 */
export function useQuickVpnCheck() {
	const [vpnCheckResult, setVpnCheckResult] = useState<VpnCheckResult | null>(null)
	const [isChecking, setIsChecking] = useState(false)

	const { refetch } = trpc.locationVerification.checkVpn.useQuery(undefined, {
		enabled: false, // Don't auto-run; we'll call it manually
		retry: false,
		refetchOnWindowFocus: false,
	})

	const performVpnCheck = useCallback(async () => {
		setIsChecking(true)
		try {
			const result = await refetch()
			if (result.data) {
				setVpnCheckResult(result.data)
			} else {
				setVpnCheckResult({
					checked: false,
					isVpn: false,
					message:
						result.error?.message ??
						"VPN check unavailable. Proceeding with location-only verification.",
				})
			}
		} catch (error) {
			console.error("[Quick VPN Check] Error:", error)
			setVpnCheckResult({
				checked: false,
				isVpn: false,
				message: "VPN check failed",
			})
		} finally {
			// Ensure terminal state even if query resolves without data/error details.
			setVpnCheckResult(
				previous =>
					previous ?? {
						checked: false,
						isVpn: false,
						message: "VPN check unavailable. Proceeding with location-only verification.",
					}
			)
			setIsChecking(false)
		}
	}, [refetch])

	return {
		vpnCheckResult,
		isChecking,
		performVpnCheck,
	}
}
