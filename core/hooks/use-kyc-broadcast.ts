"use client"

import { useEffect, useRef } from "react"

const KYC_CHANNEL_NAME = "kyc-verification-status"

export type KycBroadcastMessage = {
	type: "KYC_VERIFIED" | "KYC_REJECTED" | "KYC_PENDING"
	userId?: string
	timestamp: number
}

/**
 * Hook for cross-tab communication during KYC verification
 *
 * Zero API calls - uses BroadcastChannel API for instant tab sync
 * Gracefully degrades if BroadcastChannel not supported
 */
export function useKycBroadcast() {
	const channelRef = useRef<BroadcastChannel | null>(null)

	useEffect(() => {
		// Check if BroadcastChannel is supported
		if (typeof window !== "undefined" && "BroadcastChannel" in window) {
			try {
				channelRef.current = new BroadcastChannel(KYC_CHANNEL_NAME)
				console.log("KYC BroadcastChannel initialized")
			} catch (error) {
				console.warn("Failed to create BroadcastChannel:", error)
			}
		}

		return () => {
			if (channelRef.current) {
				channelRef.current.close()
				channelRef.current = null
			}
		}
	}, [])

	const broadcast = (message: KycBroadcastMessage) => {
		if (channelRef.current) {
			try {
				channelRef.current.postMessage(message)
				console.log("Broadcasting KYC status:", message.type)
			} catch (error) {
				console.warn("Failed to broadcast message:", error)
			}
		}
	}

	const listen = (callback: (message: KycBroadcastMessage) => void) => {
		if (channelRef.current) {
			const handler = (event: MessageEvent<KycBroadcastMessage>) => {
				console.log("📨 Received KYC broadcast:", event.data.type)
				callback(event.data)
			}

			channelRef.current.addEventListener("message", handler)

			return () => {
				channelRef.current?.removeEventListener("message", handler)
			}
		}

		return undefined
	}

	const isSupported = () => {
		return typeof window !== "undefined" && "BroadcastChannel" in window
	}

	return { broadcast, listen, isSupported }
}
