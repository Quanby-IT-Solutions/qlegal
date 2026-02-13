"use client"

import { trpc } from "@/services/trpc/client"

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
