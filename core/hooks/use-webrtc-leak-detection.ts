"use client"

import { useEffect, useMemo, useState } from "react"

interface WebrtcLeakDetectionState {
	isLeaking: boolean
	leakedIps: string[]
	expectedIp: string | null
	isLoading: boolean
}

function isPrivateIpv4(ip: string): boolean {
	const octets = ip.split(".")
	if (octets.length !== 4) {
		return true
	}

	const a = Number(octets[0])
	const b = Number(octets[1])
	if (!Number.isFinite(a) || !Number.isFinite(b)) {
		return true
	}

	return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}

export function useWebrtcLeakDetection(expectedIp: string | null): WebrtcLeakDetectionState {
	const [leakedIps, setLeakedIps] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState<boolean>(false)

	useEffect(() => {
		if (!expectedIp) {
			setLeakedIps([])
			setIsLoading(false)
			return
		}

		if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
			setLeakedIps([])
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		const discoveredIps = new Set<string>()
		const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
		const ipv4Regex = /candidate:.*\s((?:\d{1,3}\.){3}\d{1,3})\s/i

		const stop = () => {
			setLeakedIps(Array.from(discoveredIps))
			setIsLoading(false)
			pc.close()
		}

		pc.onicecandidate = event => {
			const candidate = event.candidate?.candidate
			if (!candidate) {
				return
			}

			const match = candidate.match(ipv4Regex)
			if (match?.[1]) {
				discoveredIps.add(match[1])
			}
		}

		const timeoutId = window.setTimeout(stop, 3000)

		void (async () => {
			try {
				pc.createDataChannel("leak-check")
				const offer = await pc.createOffer()
				await pc.setLocalDescription(offer)
			} catch {
				window.clearTimeout(timeoutId)
				stop()
			}
		})()

		return () => {
			window.clearTimeout(timeoutId)
			pc.close()
		}
	}, [expectedIp])

	const isLeaking = useMemo(() => {
		if (!expectedIp || leakedIps.length === 0) {
			return false
		}

		const publicIps = leakedIps.filter(ip => !isPrivateIpv4(ip))
		if (publicIps.length === 0) {
			return false
		}

		return !publicIps.includes(expectedIp)
	}, [expectedIp, leakedIps])

	return { isLeaking, leakedIps, expectedIp, isLoading }
}
