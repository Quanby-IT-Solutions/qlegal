"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { getKycWebSdkSession, syncKycStatusFromCallback } from "@/features/kyc/api/kyc.actions"

const HYPERVERGE_WEB_SDK_VERSION = "10.0.0"
const SDK_SCRIPT_URL = `https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@${HYPERVERGE_WEB_SDK_VERSION}/src/sdk.min.js`

interface HyperKycConfigInstance {
	supportDarkMode?: (v: boolean) => void
	setInputs?: (inputs: Record<string, unknown>) => void
}

declare global {
	interface Window {
		HyperKYCModule?: {
			launch: (
				config: HyperKycConfigInstance,
				callback: (result: { status: string }) => void
			) => Promise<void>
		}
		HyperKycConfig?: new (authToken: string, showLandingPage?: boolean) => HyperKycConfigInstance
	}
}

interface UseHyperVergeSDKOptions {
	onComplete?: (status: string) => void
	redirectOnSuccess?: string
}

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof window === "undefined") {
			resolve()
			return
		}
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve()
			return
		}
		const script = document.createElement("script")
		script.src = src
		script.async = true
		script.onload = () => resolve()
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
		document.head.appendChild(script)
	})
}

export function useHyperVergeSDK({
	onComplete,
	redirectOnSuccess = "/dashboard",
}: UseHyperVergeSDKOptions = {}) {
	const [status, setStatus] = useState<"idle" | "loading" | "launching" | "done">("idle")
	const [error, setError] = useState<string | null>(null)
	const hasLaunchedRef = useRef(false)
	const { broadcast } = useKycBroadcast()

	const handleSdkCallback = useCallback(
		async (result: { status: string }, transactionId: string) => {
			const s = (result?.status ?? "").trim().toLowerCase()
			await syncKycStatusFromCallback(transactionId, s)

			if (s === "auto_approved") {
				broadcast({ type: "KYC_VERIFIED", timestamp: Date.now(), transactionId })
				toast.success("Verification approved!")
				if (redirectOnSuccess) {
					window.location.href = redirectOnSuccess
				}
			} else if (s === "auto_declined") {
				broadcast({ type: "KYC_REJECTED", timestamp: Date.now(), transactionId })
				toast.error("Verification was declined. Please try again or contact support.")
			} else if (s === "needs_review") {
				toast.message("Verification is under review. We'll notify you once complete.")
			} else if (s === "user_cancelled") {
				broadcast({ type: "KYC_CANCELLED", timestamp: Date.now(), transactionId })
				toast.message("Verification cancelled.")
			} else if (s === "error") {
				toast.error("Something went wrong. Please try again.")
			}

			hasLaunchedRef.current = false // reset for retry
			setStatus("done")
			onComplete?.(s)
		},
		[broadcast, redirectOnSuccess, onComplete]
	)

	const launch = useCallback(async () => {
		if (hasLaunchedRef.current) return
		hasLaunchedRef.current = true
		setStatus("loading")
		setError(null)

		try {
			await loadScript(SDK_SCRIPT_URL)
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to load verification"
			setError(msg)
			toast.error(msg)
			hasLaunchedRef.current = false
			setStatus("done")
			onComplete?.("error")
			return
		}

		const sessionResult = await getKycWebSdkSession()
		if (!sessionResult.success || !sessionResult.data) {
			const msg = sessionResult.error ?? "Failed to start verification"
			setError(msg)
			toast.error(msg)
			hasLaunchedRef.current = false
			setStatus("done")
			onComplete?.("error")
			return
		}

		const { authToken, transactionId } = sessionResult.data
		const HyperKycConfig = window.HyperKycConfig
		const HyperKYCModule = window.HyperKYCModule

		if (!HyperKycConfig || !HyperKYCModule) {
			const msg = "Verification SDK not available. Please refresh and try again."
			setError(msg)
			toast.error(msg)
			hasLaunchedRef.current = false
			setStatus("done")
			onComplete?.("error")
			return
		}

		setStatus("launching")
		const config = new HyperKycConfig(authToken, false)
		if (typeof config.supportDarkMode === "function") {
			config.supportDarkMode(true)
		}

		await HyperKYCModule.launch(config, (result: { status: string }) => {
			void handleSdkCallback(result, transactionId)
		})
	}, [handleSdkCallback, onComplete])

	return {
		launch,
		isLoading: status === "loading" || status === "launching",
		error,
	}
}
